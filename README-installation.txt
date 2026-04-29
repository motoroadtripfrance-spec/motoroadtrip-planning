# Motoroadtrip Planning V9 - Version Pro Supabase

Cette version remplace le stockage local par une vraie base Supabase.

## Fichiers

- `index.html` : interface
- `style.css` : design
- `app.js` : logique connectée Supabase
- `config.example.js` : URL + clé publique Supabase à renseigner
- `supabase-schema.sql` : tables + règles de sécurité
- `supabase-functions/` : fonctions Edge pour créer/supprimer un guide et réinitialiser un mot de passe
- `logo-motoroadtrip.png` : logo si présent
- `motoroadtrip-visual.jpg` : image de fond si présente

## Étape 1 - Créer le projet Supabase

1. Va sur Supabase.
2. Crée un nouveau projet.
3. Va dans `Project Settings > API`.
4. Copie :
   - Project URL
   - anon public key

## Étape 2 - Configurer le site

Dans `config.example.js`, remplace :

```js
window.MOTOROADTRIP_SUPABASE_URL = "https://TON-PROJET.supabase.co";
window.MOTOROADTRIP_SUPABASE_ANON_KEY = "TON-ANON-PUBLIC-KEY";
```

par les valeurs de ton projet.

Tu peux ensuite renommer le fichier en `config.js`, mais ce n’est pas obligatoire si tu gardes le nom utilisé dans `index.html`.

## Étape 3 - Créer la base

1. Dans Supabase, ouvre `SQL Editor`.
2. Copie-colle tout le contenu de `supabase-schema.sql`.
3. Clique sur `Run`.

## Étape 4 - Créer ton compte admin Raphaël

Dans Supabase :

1. Va dans `Authentication > Users`.
2. Clique `Add user`.
3. Crée ton utilisateur admin avec ton email et ton mot de passe.
4. Copie son `User UID`.

Ensuite dans `SQL Editor`, exécute cette requête en remplaçant les valeurs :

```sql
insert into public.profiles (id, email, full_name, role, guide_id)
values (
  'TON_USER_UID',
  'ton-email@example.fr',
  'Raphaël',
  'admin',
  (select id from public.guides where name = 'Raphaël')
);
```

## Étape 5 - Déployer les Edge Functions

Les boutons :
- créer un guide
- modifier un mot de passe
- supprimer un guide

ont besoin des Edge Functions, car ces actions doivent utiliser la clé serveur Supabase.

Dossiers fournis :

```text
supabase-functions/create-guide-user/index.ts
supabase-functions/reset-guide-password/index.ts
supabase-functions/delete-guide-user/index.ts
```

Avec Supabase CLI :

```bash
supabase functions deploy create-guide-user
supabase functions deploy reset-guide-password
supabase functions deploy delete-guide-user
```

Puis configure le secret :

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TA_SERVICE_ROLE_KEY
```

La `service_role key` se trouve dans Supabase > Project Settings > API.
Ne jamais la mettre dans `app.js`.

## Étape 6 - Héberger gratuitement

Tu peux utiliser :

- Netlify
- GitHub Pages
- Cloudflare Pages

Pour un usage simple, Netlify est très facile :
1. Crée un compte Netlify.
2. Glisse-dépose le dossier complet.
3. Le site est en ligne.

## Important sécurité

- La clé `anon public key` peut être visible dans le navigateur.
- La clé `service_role` ne doit jamais être visible dans le navigateur.
- Les règles RLS protègent les données :
  - admin : voit tout
  - guide : voit uniquement ses événements

## Types d’événements inclus

- Initiation enduro
- Initiation trail
- Enduro débutant
- Enduro intermédiaire plus
- Trail
- Trail engagé
- Quad
- Enduro senior
- Sortie pépère
