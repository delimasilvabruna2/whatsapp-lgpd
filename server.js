const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

let statusUsuario = {};

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message) {
    const from = message.from;
    const texto = message.text?.body?.toLowerCase();

    if (!statusUsuario[from]) {
      await enviarMensagem(from,
        "Olá 👋\n\nVocê autoriza o uso dos seus dados conforme a LGPD?\n\nResponda:\nACEITO\nNAO ACEITO"
      );
      statusUsuario[from] = "aguardando";
      return res.sendStatus(200);
    }

    if (statusUsuario[from] === "aguardando") {

      if (texto && texto.includes("aceito")) {
        statusUsuario[from] = "aceito";

        await enviarMensagem(from,
          "Consentimento registrado ✅\nUm atendente continuará o atendimento."
        );

        return res.sendStatus(200);
      }

      if (texto && texto.includes("nao")) {
        statusUsuario[from] = "negado";

        await enviarMensagem(from,
          "Sem consentimento não podemos continuar.\nConversa encerrada."
        );

        return res.sendStatus(200);
      }

      await enviarMensagem(from,
        "Por favor responda apenas ACEITO ou NAO ACEITO."
      );
    }
  }

  res.sendStatus(200);
});

async function enviarMensagem(numero, texto) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: texto }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.listen(process.env.PORT || 3000);