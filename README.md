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
- **Poser un pont** : glisser d'une île à l'autre, toucher deux îles l'une après l'autre, ou toucher l'espace entre deux îles (0 → 1 → 2 → 0 pont).
- **Indices progressifs** : le bouton 灯 clignote après 2 minutes sans progrès. Chaque appui précise l'indice (zone, puis île, puis pont avec le raisonnement), et « Poser » applique le pont.
- **Vérifier** affiche les ponts faux en rouge. Il y a aussi Annuler, Effacer et Nouvelle grille.
- **Chronomètre** et **record par niveau** (seulement pour les parties sans indice). La partie en cours est sauvegardée automatiquement.
- **Grandes grilles** : sur téléphone, la grille s'agrandit et défile. Le lien « Vue d'ensemble » affiche la grille entière.

Fonctionne entièrement hors connexion.

## Structure

- `www/index.html` : l'application (générateur, solveur, indices, interface). Polices Shippori Mincho incluses dans `www/fonts/`.
- `assets/` : icône et écran de démarrage (sources des images générées dans `android/`).
- `android/` : projet Android généré par Capacitor, signé avec `hashi-signing.keystore` pour que les mises à jour s'installent par-dessus.
- `.github/workflows/build-apk.yml` : compile l'APK et le publie dans les Releases à chaque modification sur `main` (ou à la demande depuis l'onglet **Actions**).

## Modifier l'appli

Tester dans un navigateur : servir le dossier `www/` (par exemple `python3 -m http.server` dans `www/`) et ouvrir la page en mode mobile.
