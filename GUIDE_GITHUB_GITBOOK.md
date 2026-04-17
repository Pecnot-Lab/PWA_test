# Schéma simple GitBook + GitHub Pages

## Objectif
Publier la PWA sur GitHub Pages puis la référencer dans GitBook pour les utilisateurs.

## Architecture recommandée
- GitHub = hébergement technique de l'application
- GitHub Pages = URL publique de la PWA
- GitBook = documentation, tutoriel, bouton d'accès, QR code

## Parcours utilisateur final
1. l'utilisateur ouvre la page GitBook
2. il clique sur le bouton "Ouvrir l'application"
3. la PWA s'ouvre depuis GitHub Pages
4. il ajoute l'application à l'écran d'accueil
5. ensuite elle peut fonctionner hors ligne

## Mise en place pas à pas

### Étape 1 - créer un dépôt GitHub
Nom conseillé :
respirometre-pwa

### Étape 2 - envoyer les fichiers
Copier dans le dépôt le contenu du dossier PWA_Offline_Demo.

### Étape 3 - activer GitHub Pages
Dans GitHub :
- ouvrir Settings
- aller à Pages
- choisir Deploy from a branch
- sélectionner branch main
- choisir le dossier root
- enregistrer

### Étape 4 - récupérer l'URL publique
GitHub fournit ensuite une adresse du type :
https://votre-identifiant.github.io/respirometre-pwa/

### Étape 5 - créer la page GitBook
Dans GitBook, ajouter :
- une courte présentation
- un bouton vers l'URL publique
- une notice "Ajouter à l'écran d'accueil"
- éventuellement un QR code

## Texte conseillé pour GitBook
### Application terrain hors ligne
Cette application fonctionne sur smartphone sans 4G après installation.

1. ouvrez le lien ci-dessous
2. ajoutez l'application à l'écran d'accueil
3. utilisez-la ensuite hors ligne sur le terrain

Bouton : Ouvrir l'application

## Conseils pratiques
- faire le premier chargement avec Internet
- tester sur Android et iPhone
- conserver une page GitBook très simple
- mettre à jour GitHub quand vous améliorez la PWA

## Évolution future
Plus tard, la PWA peut envoyer ses fiches à un ESP32 en mode AP pour synchronisation locale.
