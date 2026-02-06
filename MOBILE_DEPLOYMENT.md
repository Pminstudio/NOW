# Guide de déploiement mobile NOW

## Prérequis

### Pour iOS (App Store)
- Mac avec macOS
- Xcode 15+ installé
- Compte Apple Developer (99€/an) : https://developer.apple.com
- Certificats et profils de provisionnement configurés

### Pour Android (Google Play)
- Android Studio installé
- JDK 17+
- Compte Google Play Console (25$ une fois) : https://play.google.com/console

---

## Commandes disponibles

```bash
# Développement
npm run dev              # Lance le serveur de dev web

# Build
npm run build            # Build web de production
npm run build:mobile     # Build + sync iOS et Android
npm run build:ios        # Build + sync iOS uniquement
npm run build:android    # Build + sync Android uniquement

# Capacitor
npm run cap:sync         # Sync les fichiers web vers les projets natifs
npm run cap:copy         # Copie uniquement les assets (sans plugins)
npm run cap:open:ios     # Ouvre le projet dans Xcode
npm run cap:open:android # Ouvre le projet dans Android Studio
npm run cap:run:ios      # Lance sur simulateur/device iOS
npm run cap:run:android  # Lance sur émulateur/device Android
```

---

## Déploiement iOS (App Store)

### 1. Préparation du projet

```bash
# Build et sync
npm run build:ios

# Ouvrir dans Xcode
npm run cap:open:ios
```

### 2. Configuration dans Xcode

1. **Signing & Capabilities**
   - Sélectionne ton équipe de développement
   - Configure le Bundle Identifier : `com.now.app`
   - Active "Automatically manage signing"

2. **Capabilities à activer**
   - Push Notifications
   - Background Modes → Location updates (si besoin)

3. **Info.plist** - Ajouter les descriptions de permissions :
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>NOW utilise ta position pour te montrer les pulses autour de toi.</string>
   <key>NSLocationAlwaysUsageDescription</key>
   <string>NOW utilise ta position pour te notifier des pulses proches.</string>
   ```

### 3. Build et soumission

1. **Archive**
   - Product → Archive
   - Attends la fin du build

2. **Distribute App**
   - Clique sur "Distribute App"
   - Choisis "App Store Connect"
   - Upload

3. **App Store Connect**
   - Va sur https://appstoreconnect.apple.com
   - Crée une nouvelle app
   - Remplis les métadonnées (description, screenshots, etc.)
   - Soumets pour review

---

## Déploiement Android (Google Play)

### 1. Préparation du projet

```bash
# Build et sync
npm run build:android

# Ouvrir dans Android Studio
npm run cap:open:android
```

### 2. Générer un keystore de signature

```bash
keytool -genkey -v -keystore now-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias now
```

**Important** : Garde ce keystore en sécurité, tu en auras besoin pour toutes les mises à jour.

### 3. Configuration de la signature

Édite `android/app/build.gradle` :

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('now-release-key.jks')
            storePassword 'ton_mot_de_passe'
            keyAlias 'now'
            keyPassword 'ton_mot_de_passe'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Build AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

Le fichier sera dans `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Soumission sur Google Play

1. Va sur https://play.google.com/console
2. Crée une nouvelle application
3. Remplis les informations de l'app
4. Upload l'AAB dans "Production" ou "Test interne"
5. Remplis le questionnaire de contenu
6. Soumets pour review

---

## Configuration des icônes et splash screen

### Icônes
Remplace les fichiers dans :
- `android/app/src/main/res/mipmap-*` (Android)
- `ios/App/App/Assets.xcassets/AppIcon.appiconset` (iOS)

Utilise un générateur comme https://www.appicon.co/

### Splash Screen
Les couleurs sont déjà configurées dans `capacitor.config.ts`.

Pour personnaliser l'image :
- Android : `android/app/src/main/res/drawable/splash.png`
- iOS : `ios/App/App/Assets.xcassets/Splash.imageset`

---

## Notifications Push (configuration avancée)

### iOS
1. Active Push Notifications dans Xcode
2. Configure un APNs Key dans Apple Developer Portal
3. Ajoute la clé dans Supabase ou ton service de push

### Android
1. Crée un projet Firebase : https://console.firebase.google.com
2. Ajoute l'app Android avec le package `com.now.app`
3. Télécharge `google-services.json` dans `android/app/`
4. Configure Firebase Cloud Messaging

---

## Test sur device

### iOS (sans Mac)
Tu peux utiliser les services de build cloud :
- **Codemagic** : https://codemagic.io
- **Expo EAS** (nécessite migration vers Expo)

### Android
```bash
# Connecte ton téléphone en USB avec débogage activé
npm run cap:run:android
```

---

## Checklist avant soumission

- [ ] Icônes d'app configurées
- [ ] Splash screen personnalisé
- [ ] Permissions décrites (iOS Info.plist)
- [ ] Screenshots préparés (plusieurs tailles)
- [ ] Description de l'app rédigée
- [ ] Politique de confidentialité (obligatoire)
- [ ] Conditions d'utilisation
- [ ] Catégorie d'app sélectionnée
- [ ] Tranche d'âge définie
- [ ] Version et numéro de build incrémentés
