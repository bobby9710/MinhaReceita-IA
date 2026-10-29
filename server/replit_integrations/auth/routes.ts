import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import passport from "passport";
import bcrypt from "bcryptjs";
import { insertUserSchema, type User } from "@shared/models/auth";
import { ZodError } from "zod";

function publicUser(user: User) {
  const { password, ...safe } = user;
  return safe;
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, firstName, email } = insertUserSchema.parse(req.body);
      console.log("Registering user:", username);
      const existingUser = await authStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Usuário já existe");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await authStorage.createUser({
        username,
        password: hashedPassword,
        firstName,
        email,
      });

      console.log("User created:", user.id);

      req.login(user, (err) => {
        if (err) {
          console.error("req.login error:", err);
          return res.status(500).send("Erro ao logar após registro");
        }
        res.status(201).json(publicUser(user));
      });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: err.issues[0]?.message || "Verifique os dados do cadastro." });
      if ((err as any).code === 11000) return res.status(409).json({ message: "Usuário ou e-mail já cadastrado." });
      console.error("Register error detail:", err);
      res.status(500).send("Erro ao registrar usuário");
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(publicUser(req.user!));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(publicUser(req.user!));
  });
}
