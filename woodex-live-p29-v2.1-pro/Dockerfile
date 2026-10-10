FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite headers

# Install PDO MySQL and mysqli extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Copy application files to web root
COPY . /var/www/html/

# Set appropriate permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/_private 2>/dev/null || true

# Expose port 80
EXPOSE 80

CMD ["apache2-foreground"]
