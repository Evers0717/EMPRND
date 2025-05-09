import { client } from "../db.js";

export const getAllBooks = async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM books");
    res.json(result.rows);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los libros: " + error.message });
  }
};

export const getBook = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      "SELECT * FROM books WHERE id_book = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Libro no encontrado, verifica credenciales" });
    }

    res.json(result.rows);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el libro: " + error.message });
  }
};

export const createBook = async (req, res) => {
  try {
    const { title, author, price, stock, description, image_url, age_rec_id } =
      req.body;

    const result = await client.query(
      `INSERT INTO books (title, author, price, stock, description, image_url, age_rec_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_book, created_at`,
      [title, author, price, stock, description, image_url, age_rec_id]
    );

    const newBook = result.rows[0];

    res.status(201).json({
      id: newBook.id_book,
      title,
      author,
      price,
      stock,
      description,
      image_url,
      age_rec_id,
      created_at: newBook.created_at,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar el libro: " + error.message,
    });
  }
};

export const updateBook = async (req, res) => {
  const { id } = req.params;
  const { title, author, price, stock, description, image_url, age_rec_id } =
    req.body;

  try {
    const result = await client.query(
      `UPDATE books
       SET title = $1,
           author = $2,
           price = $3,
           stock = $4,
           description = $5,
           image_url = $6,
           age_rec_id = $7
       WHERE id_book = $8
       RETURNING *`,
      [title, author, price, stock, description, image_url, age_rec_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Libro no encontrado" });
    }

    res.json({
      message: "Libro actualizado correctamente",
      book: result.rows[0],
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el libro: " + error.message });
  }
};

export const deleteBook = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query("DELETE FROM books WHERE id_book = $1", [
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Libro no encontrado" });
    }

    return res.sendStatus(204); // No content
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el libro: " + error.message });
  }
};
