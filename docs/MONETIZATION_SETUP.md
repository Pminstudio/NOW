# NOW - Guide de Configuration Monétisation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NOW App                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Free Users  │  │ Pulse+ Users│  │ Subscription Hook   │ │
│  │ (2 pulses)  │  │ (unlimited) │  │ useSubscription()   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase                                 │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ subscription_   │  │ user_           │                  │
│  │ plans           │  │ subscriptions   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Edge Functions                          │   │
│  │  • create-checkout-session                          │   │
│  │  • create-portal-session                            │   │
│  │  • stripe-webhook                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Stripe                                │
│  • Customers    • Subscriptions    • Webhooks              │
└─────────────────────────────────────────────────────────────┘
```

## Étape 1: Configuration Stripe

### 1.1 Créer un compte Stripe
1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Créer un compte ou se connecter
3. Activer le mode Test pour le développement

### 1.2 Créer les produits et prix

Dans Stripe Dashboard > Products :

**Produit: Pulse+**
- Nom: `Pulse+`
- Description: `Abonnement premium NOW`

**Prix mensuel:**
- Montant: `9.99 EUR`
- Récurrence: Mensuel
- Noter le `price_id` → `price_xxx_monthly`

**Prix annuel:**
- Montant: `89.99 EUR`
- Récurrence: Annuel
- Noter le `price_id` → `price_xxx_yearly`

### 1.3 Mettre à jour la base de données

```sql
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_xxx_monthly',
  stripe_price_id_yearly = 'price_xxx_yearly'
WHERE id = 'pulse_plus';
```

### 1.4 Configurer les webhooks

Dans Stripe Dashboard > Developers > Webhooks :

1. Ajouter un endpoint:
   - URL: `https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
   - Events à écouter:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`

2. Noter le `Webhook Signing Secret` → `whsec_xxx`

## Étape 2: Configuration Supabase

### 2.1 Variables d'environnement

Dans Supabase Dashboard > Project Settings > Edge Functions :

```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2.2 Déployer les Edge Functions

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref [PROJECT_REF]

# Déployer les fonctions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

### 2.3 Exécuter la migration

Dans Supabase SQL Editor, exécuter:
```
supabase/migrations/009_subscriptions.sql
```

## Étape 3: Configuration App

### 3.1 Variables d'environnement

Créer/mettre à jour `.env`:

```env
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

### 3.2 Intégration dans l'app

```typescript
// Dans App.tsx ou le composant parent
import { useSubscription } from './src/hooks/useSubscription';
import UpgradeModal from './components/UpgradeModal';

const App = () => {
  const {
    isPremium,
    limits,
    plans,
    currentPlan,
    canCreatePulse,
    createCheckoutSession
  } = useSubscription(userId);

  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleUpgrade = async (planId: string, cycle: 'monthly' | 'yearly') => {
    const { url, error } = await createCheckoutSession(planId, cycle);
    if (url) {
      window.location.href = url; // Redirect to Stripe Checkout
    }
  };

  // Vérifier avant de créer un pulse
  const handleCreatePulse = async () => {
    const allowed = await canCreatePulse();
    if (!allowed) {
      setShowUpgrade(true);
      return;
    }
    // ... créer le pulse
  };

  return (
    <>
      {/* ... */}
      <UpgradeModal
        isOpen={showUpgrade}
        plans={plans}
        currentPlanId={currentPlan?.id || 'free'}
        onSelectPlan={handleUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
};
```

## Étape 4: Test

### 4.1 Cartes de test Stripe

| Carte | Numéro |
|-------|--------|
| Succès | 4242 4242 4242 4242 |
| Échec | 4000 0000 0000 0002 |
| 3D Secure | 4000 0025 0000 3155 |

### 4.2 Tester le flow complet

1. Créer un compte gratuit
2. Essayer de créer 3 pulses → doit afficher UpgradeModal
3. Cliquer "Passer à Pulse+"
4. Compléter le checkout Stripe
5. Vérifier que l'utilisateur est maintenant premium
6. Créer des pulses illimités

## Étape 5: Passage en production

1. Activer le mode Live dans Stripe
2. Créer de nouveaux produits/prix en mode Live
3. Mettre à jour les variables d'environnement avec les clés Live
4. Mettre à jour les price_id dans la base de données
5. Configurer le webhook en mode Live

## Pricing recommandé

| Plan | Mensuel | Annuel | Économie |
|------|---------|--------|----------|
| Pulse+ | 9.99€ | 89.99€ | ~25% |

## Métriques à suivre

- **MRR** (Monthly Recurring Revenue)
- **Taux de conversion** Free → Pulse+
- **Churn rate** (taux d'annulation)
- **LTV** (Lifetime Value)
- **CAC** (Cost of Acquisition)

## Support

Pour les questions de facturation:
- Email: billing@now-app.com
- Stripe Customer Portal (self-service)
