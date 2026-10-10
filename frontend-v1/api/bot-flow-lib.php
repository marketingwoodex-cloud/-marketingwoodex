<?php
/**
 * Woodex Autonomous Bot Flow & Interactive State Machine Engine
 * Zero external Composer dependencies · 100% Native PHP 7.4-8.3+
 * Powers Instant BOQ Estimator, Room Quiz, Site Visit Scheduler, and Multi-Step Lead Qualification.
 */
declare(strict_types=1);

function bot_flow_migrate(): void {
    static $done = false; if ($done) return; $done = true;
    $e = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    q('CREATE TABLE IF NOT EXISTS wx_bot_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel VARCHAR(8) NOT NULL,
        sender_id VARCHAR(100) NOT NULL,
        chat_id INT NOT NULL DEFAULT 0,
        flow VARCHAR(40) NOT NULL DEFAULT \'\',
        step VARCHAR(40) NOT NULL DEFAULT \'\',
        data LONGTEXT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_chan_sender (channel, sender_id),
        INDEX idx_upd (updated_at)
    )' . $e);
}

function bot_session_get(string $channel, string $senderId, int $chatId = 0): array {
    bot_flow_migrate();
    $row = q('SELECT * FROM wx_bot_sessions WHERE channel=? AND sender_id=?', [$channel, $senderId])->fetch();
    if (!$row) return ['channel' => $channel, 'sender_id' => $senderId, 'chat_id' => $chatId, 'flow' => '', 'step' => '', 'data' => []];
    $data = !empty($row['data']) ? json_decode((string)$row['data'], true) : [];
    return [
        'id' => (int)$row['id'],
        'channel' => $row['channel'],
        'sender_id' => $row['sender_id'],
        'chat_id' => (int)$row['chat_id'],
        'flow' => (string)$row['flow'],
        'step' => (string)$row['step'],
        'data' => is_array($data) ? $data : []
    ];
}

function bot_session_save(string $channel, string $senderId, int $chatId, string $flow, string $step, array $data): void {
    bot_flow_migrate();
    q('INSERT INTO wx_bot_sessions (channel, sender_id, chat_id, flow, step, data, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE chat_id=VALUES(chat_id), flow=VALUES(flow), step=VALUES(step), data=VALUES(data), updated_at=VALUES(updated_at)',
      [$channel, $senderId, $chatId, $flow, $step, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now()]);
}

function bot_session_reset(string $channel, string $senderId): void {
    bot_flow_migrate();
    q('DELETE FROM wx_bot_sessions WHERE channel=? AND sender_id=?', [$channel, $senderId]);
}

/**
 * Main state machine message dispatcher.
 * Returns true if handled by the autonomous bot, false if should fall through to AI / Human.
 */
function bot_flow_handle(string $channel, string $senderId, string $text, array $chat, array $meta = []): bool {
    $textRaw = trim($text);
    $textLower = mb_strtolower($textRaw);
    $chatId = (int)($chat['id'] ?? 0);
    $sess = bot_session_get($channel, $senderId, $chatId);

    // 1. Direct command or reset triggers
    if ($textLower === '/reset' || $textLower === 'restart' || $textLower === 'main menu' || $textLower === 'menu') {
        bot_session_reset($channel, $senderId);
        bot_send_main_menu($channel, $senderId, $chatId);
        return true;
    }

    // 2. Trigger check if not in active flow
    if (empty($sess['flow'])) {
        if ($textLower === '/estimate' || $textLower === '/quote' || strpos($textLower, 'estimate') !== false || strpos($textLower, 'quotation') !== false || strpos($textLower, 'price') !== false || strpos($textLower, 'cost') !== false || $textRaw === 'btn_est_start' || $textLower === 'get estimate') {
            bot_session_save($channel, $senderId, $chatId, 'estimate', 'ask_space', []);
            bot_send_space_step($channel, $senderId, $chatId);
            return true;
        }
        if ($textLower === '/visit' || strpos($textLower, 'book visit') !== false || strpos($textLower, 'site visit') !== false || $textRaw === 'btn_book_visit') {
            bot_session_save($channel, $senderId, $chatId, 'visit', 'ask_date', []);
            bot_send_visit_step($channel, $senderId, $chatId);
            return true;
        }
        if ($textLower === '/portfolio' || strpos($textLower, 'portfolio') !== false || strpos($textLower, 'catalogue') !== false || $textRaw === 'btn_portfolio') {
            bot_send_portfolio($channel, $senderId, $chatId);
            return true;
        }
        return false;
    }

    // 3. Process Active Flow
    if ($sess['flow'] === 'estimate') {
        return bot_step_estimate($channel, $senderId, $chatId, $sess, $textRaw, $textLower, $chat);
    }

    if ($sess['flow'] === 'visit') {
        return bot_step_visit($channel, $senderId, $chatId, $sess, $textRaw, $textLower, $chat);
    }

    return false;
}

function bot_send_main_menu(string $channel, string $senderId, int $chatId): void {
    $title = "🏛️ *Welcome to Woodex Interior & Architecture*";
    $body = "Pakistan's premier bespoke interior design studio. How may we assist with your luxury project today?";

    if ($channel === 'wa') {
        $buttons = [
            ['id' => 'btn_est_start', 'title' => '📊 Instant BOQ Quote'],
            ['id' => 'btn_book_visit', 'title' => '📅 Book Site Visit'],
            ['id' => 'btn_portfolio', 'title' => '✨ 3D Portfolio']
        ];
        wa_interactive_buttons($senderId, $body, $buttons, "Woodex Luxury Studio", "Select an option below");
    } elseif ($channel === 'tg') {
        $kb = [
            [
                ['text' => '📊 Instant BOQ Quote', 'callback_data' => 'btn_est_start'],
                ['text' => '📅 Book Site Visit', 'callback_data' => 'btn_book_visit']
            ],
            [
                ['text' => '✨ View 3D Portfolio', 'callback_data' => 'btn_portfolio'],
                ['text' => '💬 Talk to Architect', 'callback_data' => 'btn_agent']
            ]
        ];
        tg_send_keyboard($senderId, "<b>" . tg_h($title) . "</b>\n\n" . tg_h($body), $kb);
    }
}

function bot_send_space_step(string $channel, string $senderId, int $chatId): void {
    $msg = "✨ *Step 1 of 3: Space Type*\nWhat type of project are you planning for your property?";
    if ($channel === 'wa') {
        $buttons = [
            ['id' => 'space_full', 'title' => '🛋️ Complete Home'],
            ['id' => 'space_kitchen', 'title' => '🍳 Luxury Kitchen'],
            ['id' => 'space_wardrobes', 'title' => '🚪 Custom Wardrobes']
        ];
        wa_interactive_buttons($senderId, $msg, $buttons, "Instant BOQ Estimator", "Tap your project type");
    } elseif ($channel === 'tg') {
        $kb = [
            [
                ['text' => '🛋️ Complete Home', 'callback_data' => 'space_full'],
                ['text' => '🍳 Luxury Kitchen', 'callback_data' => 'space_kitchen']
            ],
            [
                ['text' => '🚪 Custom Wardrobes', 'callback_data' => 'space_wardrobes'],
                ['text' => '🏢 Corporate Office', 'callback_data' => 'space_office']
            ]
        ];
        tg_send_keyboard($senderId, "<b>Instant BOQ Estimator</b>\n\n" . tg_h($msg), $kb);
    }
}

function bot_step_estimate(string $channel, string $senderId, int $chatId, array $sess, string $textRaw, string $textLower, array $chat): bool {
    $data = $sess['data'];
    $step = $sess['step'];

    // Step 1: Space Type Selection
    if ($step === 'ask_space') {
        $space = 'Full Home Interior';
        if (strpos($textLower, 'kitchen') !== false || $textRaw === 'space_kitchen') $space = 'Luxury Kitchen';
        elseif (strpos($textLower, 'wardrobe') !== false || $textRaw === 'space_wardrobes') $space = 'Custom Wardrobes';
        elseif (strpos($textLower, 'office') !== false || strpos($textLower, 'commercial') !== false || $textRaw === 'space_office') $space = 'Corporate Office';
        elseif (strpos($textLower, 'full') !== false || strpos($textLower, 'home') !== false || $textRaw === 'space_full') $space = 'Complete Home';

        $data['space'] = $space;
        bot_session_save($channel, $senderId, $chatId, 'estimate', 'ask_size', $data);

        $msg = "📐 *Step 2 of 3: Property Size / Covered Area*\nPlease select the approximate scale of your space:";
        if ($channel === 'wa') {
            $buttons = [
                ['id' => 'size_5marla', 'title' => '5 Marla (1,500 sqft)'],
                ['id' => 'size_10marla', 'title' => '10 Marla (3,000 sqft)'],
                ['id' => 'size_1kanal', 'title' => '1 Kanal (5,000 sqft)']
            ];
            wa_interactive_buttons($senderId, $msg, $buttons, "Space: " . $space, "Choose your property scale");
        } elseif ($channel === 'tg') {
            $kb = [
                [
                    ['text' => '5 Marla (~1,500 sqft)', 'callback_data' => 'size_5marla'],
                    ['text' => '10 Marla (~3,000 sqft)', 'callback_data' => 'size_10marla']
                ],
                [
                    ['text' => '1 Kanal (~5,000 sqft)', 'callback_data' => 'size_1kanal'],
                    ['text' => '2 Kanal+ / Luxury Villa', 'callback_data' => 'size_2kanal']
                ]
            ];
            tg_send_keyboard($senderId, "<b>Space: " . tg_h($space) . "</b>\n\n" . tg_h($msg), $kb);
        }
        return true;
    }

    // Step 2: Size Selection
    if ($step === 'ask_size') {
        $size = '10 Marla (3,000 sqft)';
        if (strpos($textLower, '5 marla') !== false || $textRaw === 'size_5marla') $size = '5 Marla (1,500 sqft)';
        elseif (strpos($textLower, '10 marla') !== false || $textRaw === 'size_10marla') $size = '10 Marla (3,000 sqft)';
        elseif (strpos($textLower, '1 kanal') !== false || $textRaw === 'size_1kanal') $size = '1 Kanal (5,000 sqft)';
        elseif (strpos($textLower, '2 kanal') !== false || $textRaw === 'size_2kanal') $size = '2 Kanal+ Villa (9,000+ sqft)';

        $data['size'] = $size;
        bot_session_save($channel, $senderId, $chatId, 'estimate', 'ask_finish', $data);

        $msg = "🪵 *Step 3 of 3: Finish & Material Standard*\nSelect your desired architectural finish quality:";
        if ($channel === 'wa') {
            $buttons = [
                ['id' => 'fin_acrylic', 'title' => '✨ Acrylic & Super Matte'],
                ['id' => 'fin_oak', 'title' => '🪵 Solid Oak & Walnut'],
                ['id' => 'fin_classic', 'title' => '🏛️ Classical Moldings']
            ];
            wa_interactive_buttons($senderId, $msg, $buttons, "Size: " . $size, "Choose material standard");
        } elseif ($channel === 'tg') {
            $kb = [
                [
                    ['text' => '✨ Acrylic & Super Matte', 'callback_data' => 'fin_acrylic'],
                    ['text' => '🪵 Solid Oak & Teak Wood', 'callback_data' => 'fin_oak']
                ],
                [
                    ['text' => '🏛️ Classical Victorian Molding', 'callback_data' => 'fin_classic'],
                    ['text' => '🌿 Minimalist European Line', 'callback_data' => 'fin_minimal']
                ]
            ];
            tg_send_keyboard($senderId, "<b>Size: " . tg_h($size) . "</b>\n\n" . tg_h($msg), $kb);
        }
        return true;
    }

    // Step 3: Finish Selection & Calculation
    if ($step === 'ask_finish') {
        $finish = 'Acrylic & Super Matte';
        if (strpos($textLower, 'oak') !== false || strpos($textLower, 'wood') !== false || $textRaw === 'fin_oak') $finish = 'Solid Oak & Teak Wood';
        elseif (strpos($textLower, 'classic') !== false || $textRaw === 'fin_classic') $finish = 'Classical Victorian Molding';
        elseif (strpos($textLower, 'minimal') !== false || $textRaw === 'fin_minimal') $finish = 'Minimalist European Line';
        elseif (strpos($textLower, 'acrylic') !== false || $textRaw === 'fin_acrylic') $finish = 'Acrylic & Super Matte';

        $data['finish'] = $finish;

        // Calculate Pricing Range in PKR
        $minPrice = 1200000;
        $maxPrice = 1800000;
        $space = $data['space'] ?? 'Complete Home';
        $size = $data['size'] ?? '10 Marla';

        if (strpos($space, 'Kitchen') !== false) {
            if (strpos($size, '5 Marla') !== false) { $minPrice = 850000; $maxPrice = 1250000; }
            elseif (strpos($size, '10 Marla') !== false) { $minPrice = 1450000; $maxPrice = 1950000; }
            elseif (strpos($size, '1 Kanal') !== false) { $minPrice = 2200000; $maxPrice = 3100000; }
            else { $minPrice = 3500000; $maxPrice = 5200000; }
        } elseif (strpos($space, 'Wardrobe') !== false) {
            if (strpos($size, '5 Marla') !== false) { $minPrice = 450000; $maxPrice = 750000; }
            elseif (strpos($size, '10 Marla') !== false) { $minPrice = 950000; $maxPrice = 1450000; }
            else { $minPrice = 1800000; $maxPrice = 2700000; }
        } else { // Complete Home
            if (strpos($size, '5 Marla') !== false) { $minPrice = 3200000; $maxPrice = 4600000; }
            elseif (strpos($size, '10 Marla') !== false) { $minPrice = 5800000; $maxPrice = 7900000; }
            elseif (strpos($size, '1 Kanal') !== false) { $minPrice = 9500000; $maxPrice = 13800000; }
            else { $minPrice = 18000000; $maxPrice = 26500000; }
        }

        $estCode = 'WX-EST-' . rand(1000, 9999);
        $minFmt = 'PKR ' . number_format($minPrice);
        $maxFmt = 'PKR ' . number_format($maxPrice);

        // Update/Create Lead in CRM
        try {
            $custName = (string)($chat['name'] ?? 'WhatsApp Client');
            $custPhone = (string)($chat['phone'] ?? $senderId);
            $service = $space . ' (' . $size . ')';
            $budget = $minFmt . ' – ' . $maxFmt;
            $note = "Estimator Bot {$estCode}:\nSpace: {$space}\nScale: {$size}\nFinish: {$finish}\nEstimated Range: {$budget}";

            $lid = (int)($chat['lead_id'] ?? 0);
            if ($lid > 0) {
                q('UPDATE wx_leads SET service=?, tags=CONCAT(IFNULL(tags,""), ",Estimator Bot,Hot"), notes=CONCAT(IFNULL(notes,""), "\n\n", ?) WHERE id=?', [$service, $note, $lid]);
            } else {
                q('INSERT INTO wx_leads (created_at, updated_at, name, phone, service, source, stage, notes, tags)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [now(), now(), $custName, $custPhone, $service, $channel === 'tg' ? 'telegram' : 'whatsapp', 'new', $note, 'Estimator Bot,Hot']);
                $newLeadId = (int)db()->lastInsertId();
                if ($chatId > 0) q('UPDATE wx_chats SET lead_id=? WHERE id=?', [$newLeadId, $chatId]);
            }
        } catch (Throwable $e) { error_log('bot estimate lead: ' . $e->getMessage()); }

        // Alert Staff Telegram Group
        if (function_exists('tg_alert')) {
            tg_alert('leads', "🎯 <b>Instant BOQ Calculation [{$estCode}]</b>\n" .
                "Client: " . tg_h((string)($chat['name'] ?? $senderId)) . "\n" .
                "Project: " . tg_h($space) . " · " . tg_h($size) . "\n" .
                "Finish: " . tg_h($finish) . "\n" .
                "Estimated BOQ: <b>{$budget}</b>\n" .
                "Channel: " . ($channel === 'tg' ? 'Telegram' : 'WhatsApp'));
        }

        // Send Result to Client
        $resultText = "✅ *Instant BOQ Estimate Ready [{$estCode}]*\n\n" .
            "🏛️ *Project:* {$space}\n" .
            "📐 *Scale:* {$size}\n" .
            "✨ *Finish:* {$finish}\n" .
            "💰 *Estimated Budget:* {$minFmt} – {$maxFmt}\n\n" .
            "💡 *Included in Woodex Turnkey Package:*\n" .
            "• Complete 3D Architectural Renders & Moodboards\n" .
            "• Moisture-Resistant HDF/MDF + Blum / Hettich Soft-Close Hardware\n" .
            "• Laser Edge-Banded Finish with 10-Year Craftsmanship Warranty\n" .
            "• Factory Fabrication & Turnkey Site Installation";

        if ($channel === 'wa') {
            $buttons = [
                ['id' => 'btn_book_visit', 'title' => '📅 Book Free Site Visit'],
                ['id' => 'btn_portfolio', 'title' => '✨ View 3D Portfolio'],
                ['id' => 'btn_agent', 'title' => '💬 Talk to Architect']
            ];
            wa_interactive_buttons($senderId, $resultText, $buttons, "Estimated Cost: {$minFmt}+", "Official Woodex Quotation");
        } elseif ($channel === 'tg') {
            $kb = [
                [
                    ['text' => '📅 Book Free 3D Site Visit', 'callback_data' => 'btn_book_visit'],
                    ['text' => '✨ View 3D Portfolio', 'callback_data' => 'btn_portfolio']
                ],
                [
                    ['text' => '💬 Talk to Chief Architect', 'callback_data' => 'btn_agent'],
                    ['text' => '🔄 Recalculate', 'callback_data' => 'btn_est_start']
                ]
            ];
            tg_send_keyboard($senderId, "<b>Official BOQ Estimate [{$estCode}]</b>\n\n" . tg_h($resultText), $kb);
        }

        bot_session_reset($channel, $senderId);
        return true;
    }

    return false;
}

function bot_send_visit_step(string $channel, string $senderId, int $chatId): void {
    $msg = "📅 *Complimentary 3D Architectural Site Visit*\n\n" .
        "Our Senior Architect will visit your site with luxury material samples, laser measurement tools, and 3D design portfolios.\n\n" .
        "Please reply with your *Site Address / Sector* (e.g. DHA Phase 6, Bahria Town Lahore, Gulberg) and *Preferred Day/Time*.";

    if ($channel === 'wa') {
        wa_text($senderId, $msg);
    } elseif ($channel === 'tg') {
        tg_send($senderId, $msg);
    }
}

function bot_step_visit(string $channel, string $senderId, int $chatId, array $sess, string $textRaw, string $textLower, array $chat): bool {
    // Record visit details
    try {
        $custName = (string)($chat['name'] ?? 'Client');
        $phone = (string)($chat['phone'] ?? $senderId);
        $lid = (int)($chat['lead_id'] ?? 0);
        $note = "Site Visit Requested via Bot:\nDetails: {$textRaw}";

        if ($lid > 0) {
            q('UPDATE wx_leads SET stage="visit", notes=CONCAT(IFNULL(notes,""), "\n\n", ?), tags=CONCAT(IFNULL(tags,""), ",Site Visit Requested") WHERE id=?', [$note, $lid]);
        }
        if (function_exists('tg_alert')) {
            tg_alert('leads', "📍 <b>Site Visit Requested!</b>\n" .
                "Client: " . tg_h($custName) . " ({$phone})\n" .
                "Location / Time: " . tg_h($textRaw) . "\n" .
                "Channel: " . ($channel === 'tg' ? 'Telegram' : 'WhatsApp'));
        }
    } catch (Throwable $e) {}

    $confirm = "✅ *Site Visit Request Received!*\n\n" .
        "Thank you! Our studio coordinator will confirm the calendar appointment and assign your dedicated Project Architect shortly.\n\n" .
        "📞 *Direct Studio Hotline:* +92 322 4000768\n" .
        "📍 *Studio:* 112-A Ahmad Block, Garden Town, Lahore";

    if ($channel === 'wa') wa_text($senderId, $confirm);
    elseif ($channel === 'tg') tg_send($senderId, $confirm);

    bot_session_reset($channel, $senderId);
    return true;
}

function bot_send_portfolio(string $channel, string $senderId, int $chatId): void {
    $title = "✨ *Woodex Luxury 3D Portfolio & Showcase*";
    $body = "Explore our recently completed luxury residences in DHA Phase 5/6, Bahria Town, and Gulberg:\n\n" .
        "🌐 *Live 360° Virtual Tours:* https://woodex.com.pk/portfolio/\n" .
        "🍳 *Luxury Kitchens:* https://woodex.com.pk/kitchen-design/\n" .
        "🚪 *Walk-in Wardrobes:* https://woodex.com.pk/wardrobe-design/\n" .
        "🛋️ *Living & Media Walls:* https://woodex.com.pk/services/\n\n" .
        "Reply *estimate* at any time to calculate your project's BOQ!";

    if ($channel === 'wa') {
        $buttons = [
            ['id' => 'btn_est_start', 'title' => '📊 Get Instant BOQ'],
            ['id' => 'btn_book_visit', 'title' => '📅 Book Site Visit'],
            ['id' => 'btn_agent', 'title' => '💬 Chat with Us']
        ];
        wa_interactive_buttons($senderId, $body, $buttons, "Woodex Studio Portfolio", "Turnkey Luxury Interiors");
    } elseif ($channel === 'tg') {
        $kb = [
            [
                ['text' => '📊 Get Instant BOQ', 'callback_data' => 'btn_est_start'],
                ['text' => '📅 Book Site Visit', 'callback_data' => 'btn_book_visit']
            ],
            [
                ['text' => '🌐 Open Portfolio Website', 'url' => 'https://woodex.com.pk/portfolio/']
            ]
        ];
        tg_send_keyboard($senderId, "<b>" . tg_h($title) . "</b>\n\n" . tg_h($body), $kb);
    }
}
