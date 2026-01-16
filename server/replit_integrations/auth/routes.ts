import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import passport from "passport";
import bcrypt from "bcryptjs";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, firstName, email } = req.body;
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

      req.login(user, (err) => {
        if (err) return res.status(500).send("Erro ao logar após registro");
        res.status(201).json(user);
      });
    } catch (err) {
      res.status(500).send("Erro ao registrar usuário");
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
