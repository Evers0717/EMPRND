import { client } from "../db.js";

export const addGenre = async (req, res) => {
  const { name } = req.body;

  try {
    const result = await client.query(
      "INSERT INTO genres (name) VALUES ($1) RETURNING id",
      [name]
    );

    const newGenre = result.rows[0];

    res.status(201).json({
      id: newGenre.id,
      name,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al agregar el género: " + error.message });
  }
};

export const getGenres = async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM genres");
    const genres = result.rows;

    res.status(200).json(genres);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los géneros: " + error.message });
  }
};
