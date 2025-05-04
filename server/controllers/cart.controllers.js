import { client } from "../db.js";

const createCart = async (userId) => {
  try {
    const result = await client.query(
      "INSERT INTO carts (user_id) VALUES ($1) RETURNING id_cart",
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear el carrito: " + error.message);
    throw new Error("Error al crear el carrito");
  }
};

const getActiveCartByUserId = async (userId) => {
  try {
    const result = await client.query(
      "SELECT * FROM carts WHERE user_id = $1 AND status = '0'",
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error al obtener el carrito activo: " + error.message);
    throw new Error("Error al obtener el carrito activo");
  }
};

export const addBookToCart = async (req, res) => {
  const { bookId, user_id, quantity, unit_price } = req.body;

  try {
    let cart = await getActiveCartByUserId(user_id);

    if (!cart) {
      cart = await createCart(user_id);
    }

    const cartId = cart.id_cart;

    const result = await client.query(
      "INSERT INTO cart_items (cart_id, book_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING id",
      [cartId, bookId, quantity, unit_price]
    );

    const newCartItem = result.rows[0];

    res.status(201).json({
      id: newCartItem.id,
      cartId,
      bookId,
    });
  } catch (error) {
    console.error("Error al agregar el libro al carrito: " + error.message);
    res.status(500).json({
      message: "Error al agregar el libro al carrito: " + error.message,
    });
  }
};

export const getActiveCart = async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await getActiveCartByUserId(userId);

    if (!cart) {
      return res.status(404).json({
        message: "Carrito no encontrado",
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error("Error al obtener el carrito: " + error.message);
    res.status(500).json({
      message: "Error al obtener el carrito: " + error.message,
    });
  }
};

export const deleteBookFromCart = async (req, res) => {
  const { bookId, cartId } = req.body;

  try {
    const result = await client.query(
      "DELETE FROM cart_items WHERE cart_id = $1 AND book_id = $2 RETURNING id",
      [cartId, bookId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No se encontró el libro en el carrito",
      });
    }

    res.status(200).json({
      message: "Libro eliminado del carrito",
    });
  } catch (error) {
    console.error("Error al eliminar el libro del carrito: " + error.message);
    res.status(500).json({
      message: "Error al eliminar el libro del carrito: " + error.message,
    });
  }
};
