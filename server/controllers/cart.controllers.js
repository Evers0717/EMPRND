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
  const { bookId, user_id, quantity } = req.body;

  try {
    let cart = await getActiveCartByUserId(user_id);

    if (!cart) {
      cart = await createCart(user_id);
    }

    const cartId = cart.id_cart;

    let book_price = await client.query(
      "SELECT price FROM books WHERE id_book = $1",
      [bookId]
    );

    const result = await client.query(
      "INSERT INTO cart_items (cart_id, book_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING id",
      [cartId, bookId, quantity, book_price.rows[0].price]
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

export const clearCart = async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await getActiveCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({
        message: "No se encontró un carrito activo para el usuario",
      });
    }
    const cartId = cart.id_cart;
    const result = await client.query(
      "DELETE FROM cart_items WHERE cart_id = $1",
      [cartId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No se encontraron elementos en el carrito",
      });
    }

    res.status(200).json({
      message: "Carrito limpiado",
    });
  } catch (error) {
    console.error("Error al limpiar el carrito: " + error.message);
    res.status(500).json({
      message: "Error al limpiar el carrito: " + error.message,
    });
  }
};

export const getCartItems = async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await getActiveCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({
        message: "No se encontró un carrito activo para el usuario",
      });
    }
    const cartId = cart.id_cart;
    const result = await client.query(
      `SELECT ci.*, b.title AS book_title ,b.image_url
       FROM cart_items ci 
       JOIN books b ON ci.book_id = b.id_book 
       WHERE ci.cart_id = $1`,
      [cartId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No se encontraron elementos en el carrito",
      });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Error al obtener los elementos del carrito: " + error.message
    );
    res.status(500).json({
      message: "Error al obtener los elementos del carrito: " + error.message,
    });
  }
};

export const updateCartItem = async (req, res) => {
  const { cartId, bookId, quantity } = req.body;

  try {
    const result = await client.query(
      "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND book_id = $3 RETURNING id",
      [quantity, cartId, bookId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No se encontró el libro en el carrito",
      });
    }

    res.status(200).json({
      message: "Cantidad actualizada",
    });
  } catch (error) {
    console.error(
      "Error al actualizar la cantidad del libro: " + error.message
    );
    res.status(500).json({
      message: "Error al actualizar la cantidad del libro: " + error.message,
    });
  }
};

export const createPayment = async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await getActiveCartByUserId(userId);
    if (!cart) {
      return res.status(404).json({
        message: "No se encontró un carrito activo para el usuario",
      });
    }

    const cartId = cart.id_cart;
    const totalPrice = await getTotalPrice(cartId);

    if (totalPrice === 0) {
      return res.status(400).json({
        message: "El carrito está vacío",
      });
    }

    const result = await client.query(
      "INSERT INTO payments (cart_id, amount) VALUES ($1, $2) RETURNING id",
      [cartId, totalPrice]
    );

    if (result.rowCount === 0) {
      return res.status(500).json({
        message: "Error al procesar el pago",
      });
    }

    const paymentId = result.rows[0].id;

    res.status(201).json({
      message: "Pago creado. Falta subir el comprobante.",
      paymentId,
    });
  } catch (error) {
    console.error("Error al procesar el pago: " + error.message);
    res.status(500).json({
      message: "Error al procesar el pago: " + error.message,
    });
  }
};

const getTotalPrice = async (cartId) => {
  try {
    const result = await client.query(
      "SELECT SUM(quantity * unit_price) AS total_price FROM cart_items WHERE cart_id = $1",
      [cartId]
    );
    return result.rows[0].total_price || 0;
  } catch (error) {
    console.error("Error al obtener el precio total: " + error.message);
    throw new Error("Error al obtener el precio total");
  }
};

export const uploadDeposit = async (req, res) => {
  const { userId } = req.params;
  const cart = await getActiveCartByUserId(userId);
  if (!cart) {
    return res.status(404).json({
      message: "No se encontró un carrito activo para el usuario",
    });
  }
  const cartId = cart.id_cart;

  const file = req.file;
  if (!file) {
    return res.status(400).json({
      message: "No se adjuntó ningún archivo",
    });
  }
  const fileName = file.filename;
  const fileUrl = `/uploads/${fileName}`;
  try {
    await client.query(
      "UPDATE payments SET payment_proof_url = $1 WHERE cart_id = $2",
      [fileUrl, cartId]
    );
    const cartUpdate = await client.query(
      "UPDATE carts SET status = '1' WHERE id_cart = $1",
      [cartId]
    );

    if (cartUpdate.rowCount === 0) {
      return res.status(500).json({
        message: "Error al actualizar el carrito",
      });
    }
    res.status(200).json({
      message: "Depósito subido correctamente",
      filePath,
    });
  } catch (error) {
    console.error("Error al subir el depósito: " + error.message);
    res.status(500).json({
      message: "Error al subir el depósito: " + error.message,
    });
  }
};
