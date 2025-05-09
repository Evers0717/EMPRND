import { client } from "../db.js";

export const getUsers = async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los usuarios: " + error.message });
  }
};

export const getUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    res.status(200).json({
      id: user.id_user,
      name: user.name,
      email: user.email,
      adress: user.adress,
      phone: user.phone,
      created_at: user.created_at,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al verificar el usuario: " + error.message,
    });
  }
};

import bcrypt from "bcrypt";

export const createUser = async (req, res) => {
  try {
    const { name, email, password, adress, phone } = req.body;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      `INSERT INTO users (name, email, password, adress, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_user, created_at`,
      [name, email, hashedPassword, adress, phone]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      id: newUser.id_user,
      name,
      email,
      adress,
      phone,
      created_at: newUser.created_at,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear el usuario: " + error.message,
    });
  }
};
