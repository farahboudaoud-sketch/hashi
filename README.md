# Hashi 橋

Jeu de logique Hashi (Hashiwokakero) pour Android, en esthétique zen japonais : fond bleu nuit, encre blanc cassé, sceau bordeaux.

## Installer l'application sur le téléphone

1. Sur ton téléphone, ouvre la page **Releases** de ce dépôt (colonne de droite sur GitHub, ou `…/hashi/releases`).
2. Dans la dernière version, touche le fichier `hashi-1.0.X.apk` pour le télécharger.
3. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation depuis cette source : accepte, puis touche **Installer**.
4. Si Google Play Protect affiche un avertissement (« application inconnue »), choisis **Installer quand même**. C'est normal pour une appli qui ne vient pas du Play Store.

Les mises à jour s'installent par-dessus l'ancienne version sans perdre la partie en cours ni les records.

## Le jeu

- **5 niveaux** : Facile 7×7, Moyen 10×10, Difficile 13×13, Expert 13×18, Maître 18×22. Chaque grille est générée au hasard et un solveur vérifie qu'elle n'a qu'une seule solution.
- **Page d'accueil** : choix du niveau (avec les records) et reprise de la partie en cours. Le bouton ‹ ramène à l'accueil.
- **Poser un pont** : glisser le doigt d'une île vers une île voisine ; un deuxième glissement pose un deuxième pont (2 au maximum).
- **Retirer un pont** : le toucher ; chaque toucher en retire un.
- **Indices progressifs** : le bouton 灯 clignote après 2 minutes sans progrès. Chaque appui précise l'indice (zone, puis île, puis pont avec le raisonnement), et « Poser » applique le pont.
- Barre d'actions en haut : **Annuler**, **Vérifier** (ponts faux en rouge), **Indice**, **Effacer**, **Nouvelle** grille.
- **Chronomètre** et **record par niveau** (seulement pour les parties sans indice). La partie en cours est sauvegardée automatiquement.
- **Zoom** : pincer à deux doigts (ou molette) ; une fois zoomé, glisser depuis un espace vide pour se déplacer. Tout tient sur un écran, sans défilement, quel que soit le niveau.
- **Animation de lancement** : les îles se relient puis le kanji 橋 apparaît (toucher l'écran pour la passer).

Fonctionne entièrement hors connexion.

## Structure

- `src/` : sources de l'appli (`template.html`, `engine.js` générateur et solveur, `ui.js` interface, `native.js` bouton retour Android). `python3 src/build.py` assemble `www/index.html` (APK) et `preview.html` (version web).
- `www/` : l'application assemblée, avec les polices Shippori Mincho et Zen Kaku Gothic (chiffres) dans `www/fonts/`.
- `assets/` : icône et écran de démarrage (sources des images générées dans `android/`).
- `android/` : projet Android généré par Capacitor, signé avec `hashi-signing.keystore` pour que les mises à jour s'installent par-dessus.
- `.github/workflows/build-apk.yml` : compile l'APK et le publie dans les Releases à chaque modification sur `main` (ou à la demande depuis l'onglet **Actions**).

## Modifier l'appli

Modifier les fichiers de `src/`, lancer `python3 src/build.py`, puis tester dans un navigateur : servir le dossier `www/` (par exemple `python3 -m http.server` dans `www/`) et ouvrir la page en mode mobile.
