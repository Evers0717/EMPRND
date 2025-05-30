import nodemailer from "nodemailer";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { client } from "../db.js";

export const confirmPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      "UPDATE payments SET payment_status = '1' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    const updatedInvoice = result.rows[0];
    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error("Error al confirmar el pago: " + error.message);
    res.status(500).json({
      message: "Error al confirmar el pago: " + error.message,
    });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM payments");
    const payments = result.rows;

    if (payments.length === 0) {
      return res.status(404).json({ message: "No se encontraron pagos" });
    }

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error al obtener los pagos: " + error.message);
    res.status(500).json({
      message: "Error al obtener los pagos: " + error.message,
    });
  }
};

export const getUnconfirmedPayments = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM payments WHERE payment_status = '0'"
    );
    const unconfirmedPayments = result.rows;

    if (unconfirmedPayments.length === 0) {
      return res.status(404).json({ message: "No se encontraron pagos" });
    }

    res.status(200).json(unconfirmedPayments);
  } catch (error) {
    console.error("Error al obtener los pagos: " + error.message);
    res.status(500).json({
      message: "Error al obtener los pagos: " + error.message,
    });
  }
};

export const getConfirmedPayments = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM payments WHERE payment_status = '1'"
    );
    const confirmedPayments = result.rows;

    if (confirmedPayments.length === 0) {
      return res.status(404).json({ message: "No se encontraron pagos" });
    }

    res.status(200).json(confirmedPayments);
  } catch (error) {
    console.error("Error al obtener los pagos: " + error.message);
    res.status(500).json({
      message: "Error al obtener los pagos: " + error.message,
    });
  }
};

export const createInvoice = async (req, res) => {
  const { paymentId } = req.params;
  console.log("paymentId recibido:", paymentId);

  try {
    const payment = await client.query("SELECT * FROM payments WHERE id = $1", [
      paymentId,
    ]);
    if (payment.rowCount === 0)
      return res.status(404).json({ message: "Pago no encontrado" });

    const cartId = payment.rows[0].cart_id;

    const [items, user] = await Promise.all([
      client.query(
        "SELECT b.title, ci.quantity, ci.unit_price FROM cart_items ci JOIN books b ON b.id_book = ci.book_id WHERE cart_id = $1",
        [cartId]
      ),
      client.query(
        "SELECT * FROM users WHERE id_user = (SELECT user_id FROM carts WHERE id_cart = $1)",
        [cartId]
      ),
    ]);

    if (items.rowCount === 0)
      return res
        .status(404)
        .json({ message: "No se encontraron elementos en el carrito" });

    const invoiceHTML = `
      <html>
      <head>
        <style>
          body { font-family: Arial; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Factura</h1>
        <p><strong>Orden #${paymentId}</strong></p>
        <p><strong>Total:</strong> $${payment.rows[0].amount}</p>
        <table>
          <thead>
            <tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr>
          </thead>
          <tbody>
            ${items.rows
              .map(
                (item) =>
                  `<tr><td>${item.title}</td><td>${item.quantity}</td><td>$${item.unit_price}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(invoiceHTML);
    const pdfPath = path.join("invoices", `invoice-${paymentId}.pdf`);
    await page.pdf({ path: pdfPath, format: "A4" });
    await browser.close();

    const invoiceData = await client.query(
      "INSERT INTO invoices (payment_id, invoice_number, customer_email, total_amount, invoice_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        paymentId,
        user.rows[0].phone, // ⚠️ asegúrate que esto no sea NULL
        user.rows[0].email,
        payment.rows[0].amount,
        pdfPath,
      ]
    );

    if (invoiceData.rowCount === 0) {
      return res.status(500).json({ message: "Error al crear la factura" });
    }

    const invoice = invoiceData.rows[0];
    console.log("Factura creada:", invoice);

    return res.status(201).json({
      message: "Factura creada exitosamente",
      invoice,
    });
  } catch (error) {
    console.error("Error al crear la factura:", error.message);
    return res
      .status(500)
      .json({ message: "Error al crear la factura: " + error.message });
  }
};

//qjmk vmzs qbfc kgik

export const sendInvoiceEmail = async (req, res) => {
  const { InvoiceId } = req.params;
  try {
    const invoice = await client.query("SELECT * FROM invoices WHERE id = $1", [
      InvoiceId,
    ]);
    if (invoice.rowCount === 0) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "evers0717@gmail.com",
        pass: "qjmk vmzs qbfc kgik",
      },
    });
    const pdfPath = path.join(
      "invoices",
      `invoice-${invoice.rows[0].payment_id}.pdf`
    );

    await transporter.sendMail({
      from: "evers0717@gmail.com",
      to: invoice.rows[0].customer_email,
      subject: "Tu factura de compra",
      text: "Adjunto encontrarás tu factura en formato PDF.",
      attachments: [
        {
          filename: `invoice-${invoice.rows[0].payment_id}.pdf`,
          path: pdfPath,
        },
      ],
    });

    res.json({ message: "Factura enviada correctamente" });
  } catch (error) {
    console.error("Error al enviar la factura:", error.message);
    res
      .status(500)
      .json({ message: "Error al enviar factura: " + error.message });
  }
};
