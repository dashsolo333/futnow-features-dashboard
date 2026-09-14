# Futnow · Features

Dashboard d'équipe pour suivre les features Futnow de l'idée à la prod.
Page statique hébergée sur GitHub Pages, données dans `data/features.json`
versionnées par Git : chaque modification faite depuis la page devient un commit
au nom de la personne connectée.

**Page :** https://dashsolo333.github.io/futnow-features-dashboard/

## Ce que ça fait

- **Tableau** kanban par étape (glisser-déposer), **Liste** triable, **Roadmap**
  semaine par semaine, **Versions** (trains de release), **Journal** d'activité.
- **Jauge** par feature = position dans le pipeline + avancement dans l'étape.
- **Pipeline modulable** (réglages → Pipeline) : renommer, recolorer, réordonner,
  ajouter des étapes. Deux étapes portent une garde :
  - entrer en **prod test** date automatiquement le test réel ;
  - entrer en **prod final** exige que le **dernier test soit OK** (forçable, journalisé).
- **Page par feature** (clic sur une carte, lien `#f=<id>` partageable) : jauge et pipeline
  en tête, bouton « Passer en … », **checklist centrale** groupée par étape (échéances,
  qui a coché quand, checklist type spec → stores), description, sessions de test,
  historique complet, **jalons** Prod test / Prod final (J-x, retard, fait, raccourcis),
  frise datée, liens, personnes.
- **Sessions de test** : testeur, plateforme, build, verdict OK/KO, notes.
- **Temporalité** : dates cibles et réelles prod test / prod final, retard en rouge.
- **Fiches vierges** : bouton « Feature » (ou touche `n`) pour une idée sans mockup.
- 26 fiches pré-remplies depuis le catalogue DevHub de `futnow-app`.

## Écrire depuis la page

1. Être collaborateur du dépôt.
2. Créer un token avec accès complet au dépôt (lien pré-rempli, la case `repo` est cochée) :
   https://github.com/settings/tokens/new?scopes=repo&description=Futnow%20Features
   Alternative restrictive : token fine-grained limité à ce dépôt, Contents : *Read and write*.
3. Dans la page, « Connexion » → coller le token → Vérifier.

Le token reste dans le navigateur (localStorage). Sans token, la page est en lecture.
À la connexion, la page teste le droit d'écriture **du token lui-même** (un token
fine-grained sans « Contents : write » est refusé avec un message clair). Si un
enregistrement échoue, un bandeau rouge reste affiché tant que des modifications ne sont
pas sauvegardées, et le navigateur prévient avant de fermer l'onglet.
Les conflits d'écriture (deux personnes en même temps) sont résolus en rejouant les
opérations locales sur la version distante.

## Développement

```bash
npm test               # tests du modèle (node --test)
npm run test:coverage
npm run serve          # http://127.0.0.1:4173/?dev=1  (utilisateur simulé, rien n'est écrit)
                       # …&fail=1 : les écritures échouent, pour tester le bandeau d'alerte
npm run seed -- ../futnow-app --force   # régénérer data/features.json depuis le DevHub
```

Raccourcis : `n` nouvelle feature · `/` recherche · `1`–`5` vues · `Échap` fermer.

## Structure

```
index.html            coquille
styles/               tokens, base, composants, vues
js/model/             modèle pur (doc, stages, features, roadmap, merge, seed) — testé
js/github.js          API GitHub Contents (lecture ETag, écriture avec sha)
js/store.js           état + file d'opérations optimistes + rejeu sur conflit
js/ui/                vues et composants (aucun innerHTML)
data/features.json    la base de données
```
