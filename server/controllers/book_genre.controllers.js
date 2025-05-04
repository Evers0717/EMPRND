import { client } from "../db.js";

export const addGenreToBook = async (req, res) => {
  const { bookId, genreId } = req.body;

  try {
    const result = await client.query(
      "INSERT INTO book_genres (book_id, genre_id) VALUES ($1, $2) RETURNING id",
      [bookId, genreId]
    );

    const newBookGenre = result.rows[0];

    res.status(201).json({
      id: newBookGenre.id,
      bookId,
      genreId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al agregar el género al libro: " + error.message,
    });
  }
};

export const getGenresByBook = async (req, res) => {
  const { bookId } = req.params;

  try {
    const result = await client.query(
      "SELECT g.id, g.name FROM genres g JOIN book_genres bg ON g.id = bg.genre_id WHERE bg.book_id = $1",
      [bookId]
    );

    const genres = result.rows;

    res.status(200).json(genres);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener los géneros del libro: " + error.message,
    });
  }
};

export const deleteGenreFromBook = async (req, res) => {
  const { bookId, genreId } = req.params;

  try {
    const result = await client.query(
      "DELETE FROM book_genres WHERE book_id = $1 AND genre_id = $2 RETURNING id",
      [bookId, genreId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No se encontró la relación entre el libro y el género",
      });
    }

    res.status(200).json({
      message: "Género eliminado del libro con éxito",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar el género del libro: " + error.message,
    });
  }
};
