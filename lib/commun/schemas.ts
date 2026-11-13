// Schémas de validation partagés : toute entrée passe par un schéma borné (docs/03-securite.md, section 4.6).
import { z } from "zod";

export const adresse = z.string().trim().toLowerCase().min(5).max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
export const code = z.string().trim().regex(/^\d{6}$/);
export const prenom = z.string().trim().min(1).max(40).regex(/^\p{L}[\p{L} '’-]*$/u);
export const noteVisee = z.union([z.literal(10), z.literal(14), z.literal(18)]);
export const numFiche = z.number().int().min(1).max(99);
export const cleItem = z.string().regex(/^\d{1,2}-(q|ex)\d{1,3}$/);
export const resultat = z.enum(["ok", "partiel", "ko"]);
export const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuid = z.uuid();
