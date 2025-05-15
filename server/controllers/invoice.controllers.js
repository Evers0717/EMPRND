import nodemailer from "nodemailer";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
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

export const getUserPayments = async (req, res) => {
  const { id_user } = req.params;
  try {
    const result = await client.query(
      `SELECT 
  p.id AS payment_id,
  p.cart_id,
  p.amount,
  p.payment_status,
  p.payment_proof_url,
  p.created_at
FROM payments p
JOIN carts c ON p.cart_id = c.id_cart
WHERE c.user_id = $1
ORDER BY p.created_at DESC;`,
      [id_user]
    );
    const payments = result.rows;
    if (payments.length === 0) {
      return res.status(404).json({ message: "No se encontraron pagos" });
    }
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error al obtener los pagos del usuario: " + error.message);
    throw new Error("Error al obtener los pagos del usuario");
  }
};

export const getUserInvoicesByPaymentId = async (req, res) => {
  const { userId, paymentId } = req.body;

  try {
    const invoiceResult = await client.query(
      `
      SELECT 
        i.id AS invoice_id,
        i.invoice_number,
        i.invoice_url,
        i.payment_id,
        i.issued_at AS invoice_created_at,
        p.amount,
        p.payment_status,
        p.created_at AS payment_created_at,
        c.id_cart,
        u.name AS user_name,
        u.email AS customer_email,
        u.adress AS user_address,
        u.phone AS user_phone
      FROM invoices i
      JOIN payments p ON i.payment_id = p.id
      JOIN carts c ON p.cart_id = c.id_cart
      JOIN users u ON c.user_id = u.id_user
      WHERE c.user_id = $1 AND p.id = $2
      ORDER BY i.issued_at DESC
      `,
      [userId, paymentId]
    );

    const invoices = [];

    for (const row of invoiceResult.rows) {
      const itemsResult = await client.query(
        `
        SELECT
          ci.id,
          b.title,
          ci.quantity,
          ci.unit_price
        FROM cart_items ci
        JOIN books b ON ci.book_id = b.id_book
        WHERE ci.cart_id = $1
        `,
        [row.id_cart]
      );

      invoices.push({
        id: row.invoice_id,
        invoice_number: row.invoice_number,
        paymentId: row.payment_id,
        invoiceUrl: row.invoice_url,
        date: row.invoice_created_at,
        amount: parseFloat(row.amount),
        status: row.payment_status,
        items: itemsResult.rows.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.unit_price),
        })),
        paymentDate: row.payment_created_at,
        downloadUrl: row.invoice_url || "#",
        user: {
          name: row.user_name,
          address: row.user_address,
          phone: row.user_phone,
          customerEmail: row.customer_email,
        },
      });
    }

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error al obtener las facturas:", error.message);
    res.status(500).json({ message: "Error al obtener las facturas" });
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

    const qrDataUrl = await QRCode.toDataURL(`https://qrco.de/bfzneA`);

    const invoiceHTML = `
      <html>
        <head>
        <style>
          body {
          font-family: Arial, sans-serif;
          padding: 20px;
          font-size: 12px;
          color: #000;
          }
          .header {
          text-align: center;
          font-weight: bold;
          margin-bottom: 20px;
          }
          .section {
          margin-top: 20px;
          }
          table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          }
          th, td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
          }
          .totals {
          float: right;
          width: 40%;
          margin-top: 20px;
          }
          .totals td {
          border: none;
          }
          .info {
          margin-top: 40px;
          font-size: 10px;
          }
          .qr-container {
          margin-top: 30px;
          text-align: center;
          }
        </style>
        </head>
        <body>
        <div class="header">
          <h2>Comprobante auxiliar de factura electrónica</h2>
          <p>Factura de Operación Interna</p>
        </div>
      
        <div class="section">
          <strong>Emisor:</strong> EL RINCON DORADO S.A.<br />
          RUC: 1234567-8-91011<br />
          Dirección: David, Edificio 123, Piso 69<br />
          DV: 52
        </div>
      
        <div class="section">
          <strong>Cliente:</strong> ${user.rows[0].email}<br />
          Teléfono: ${user.rows[0].phone || "N/A"}
        </div>
      
        <div class="section">
          <strong>Número de Orden:</strong> ${paymentId}<br />
          <strong>Fecha:</strong> ${new Date().toLocaleDateString()}
        </div>
      
        <table>
          <thead>
          <tr>
            <th>No.</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Valor Total</th>
          </tr>
          </thead>
          <tbody>
          ${items.rows
            .map(
              (item, index) =>
                `<tr>
              <td>${index + 1}</td>
              <td>${item.title}</td>
              <td>${Number(item.quantity).toFixed(2)}</td>
              <td>$${Number(item.unit_price).toFixed(2)}</td>
              <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
              </tr>`
            )
            .join("")}
          </tbody>
        </table>
      
        <table class="totals">
          <tr><td>Total Neto:</td><td>$${Number(payment.rows[0].amount).toFixed(
            2
          )}</td></tr>
          <tr><td>ITBMS (7%):</td><td>$${(0).toFixed(2)}</td></tr>
          <tr><td><strong>Total a Pagar:</strong></td><td><strong>$${Number(
            payment.rows[0].amount
          ).toFixed(2)}</strong></td></tr>
        </table>
      
        <div class="qr-container">
          <p>Escanee el código para validar la factura</p>
          <img src="${qrDataUrl}" width="150" />
        </div>
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
