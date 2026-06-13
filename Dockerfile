FROM php:8.2-apache

# Activer les en-têtes si nécessaire
RUN a2enmoud headers || true

# Copier tous les fichiers du jeu dans le serveur Apache
COPY . /var/www/html/

# Donner les droits d'écriture pour le dossier des salons (rooms)
RUN mkdir -p /var/www/html/rooms && chmod -R 777 /var/www/html/rooms

# Exposer le port par défaut d'Apache
EXPOSE 80