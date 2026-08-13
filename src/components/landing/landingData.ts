import { Boxes, Brush, CarFront, CircleHelp, Flower2, Laptop, PackageOpen, PaintRoller, Refrigerator, Shirt, Sparkles, Truck, Wrench, Zap, Droplets, Hammer } from 'lucide-react';

export const landingServices = [
  { label: 'Assemblage de meubles', icon: Boxes }, { label: 'Ménage', icon: Sparkles },
  { label: 'Peinture', icon: PaintRoller }, { label: 'Déménagement', icon: Truck },
  { label: 'Petites réparations', icon: Brush }, { label: 'Organisation', icon: PackageOpen },
  { label: 'Jardinage', icon: Flower2 }, { label: 'Transport léger', icon: CarFront },
  { label: 'Aide technologique', icon: Laptop }, { label: 'Aide avec les vêtements', icon: Shirt },
  { label: 'Aide avec les électroménagers', icon: Refrigerator }, { label: 'Électricien', icon: Zap },
  { label: 'Mécanicien', icon: Wrench }, { label: 'Plombier', icon: Droplets },
  { label: 'Menuisier', icon: Hammer }, { label: 'Autre coup de main', icon: CircleHelp },
] as const;

export const helperBadges = ['Nouveau', 'Débutant', 'Professionnel', 'Élite', 'Top Helper', 'Légende'] as const;

export const faqs = [
  { question: 'Est-ce que Link Help est déjà disponible?', answer: 'Nous préparons un lancement progressif au Québec. La liste d’attente vous donne accès aux nouvelles et aux premières invitations.' },
  { question: 'Est-ce gratuit de rejoindre la liste?', answer: 'Oui. L’inscription à la liste d’attente est gratuite et ne vous engage à rien.' },
  { question: 'Puis-je m’inscrire comme client et comme helper?', answer: 'Oui. Choisissez « Les deux » et nous adapterons les nouvelles à vos intérêts.' },
  { question: 'Dans quelles villes Link Help sera lancé?', answer: 'Le déploiement commencera au Québec selon la demande locale. Votre ville nous aide à choisir les prochaines communautés.' },
  { question: 'Quels services seront permis?', answer: 'Link Help vise les services pratiques du quotidien. Les services réglementés seront proposés uniquement lorsque les exigences de qualification et les règles applicables pourront être respectées.' },
] as const;
