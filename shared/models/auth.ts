import { z } from "zod";
export const insertUserSchema = z.object({
 username: z.string().trim().min(3, "O usuário deve ter pelo menos 3 caracteres.").max(100, "O usuário deve ter no máximo 100 caracteres."),
 password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(200, "A senha deve ter no máximo 200 caracteres."),
 email: z.preprocess(
   value => typeof value === "string" && value.trim() === "" ? undefined : value,
   z.string().trim().email("Informe um e-mail válido ou deixe o campo vazio.").nullable().optional(),
 ),
 firstName: z.string().max(100, "O nome deve ter no máximo 100 caracteres.").nullable().optional(),
 lastName: z.string().max(100).nullable().optional(), profileImageUrl: z.string().nullable().optional(),
});
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = UpsertUser & { id: number; createdAt: Date; updatedAt: Date };
