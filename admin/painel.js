const listaPedidos = document.getElementById("lista-pedidos");
const btnSair = document.getElementById("btn-sair");

const STATUS_SEGUINTE = {
  AGUARDANDO_PAGAMENTO: "PAGO",
  PAGO: "ENTREGUE"
};

const STATUS_LABEL = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado"
};

verificarLoginEIniciar();



async function verificarLoginEIniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
     window.location.replace("login.html");
    return;
  }

  carregarPedidos();
  iniciarEscutaTempoReal();
}

supabaseClient.auth.onAuthStateChange((evento, sessao) => {
  if (evento === "SIGNED_OUT" || !sessao) {
     window.location.replace("login.html");
  }
});

function iniciarEscutaTempoReal() {
  supabaseClient
    .channel("pedidos-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          tocarSomNotificacao();
        }
        carregarPedidos();
      }
    )
    .subscribe();
}

function tocarSomNotificacao() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (erro) {
    console.error("Não foi possível tocar o som de notificação", erro);
  }
}

btnSair.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.replace("login.html");
});

async function carregarPedidos() {
  const { data: pedidos, error } = await supabaseClient
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        order_item_adicionais (*)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    listaPedidos.innerHTML = `<p class="erro-cliente">Erro ao carregar pedidos: ${error.message}</p>`;
    return;
  }

  if (pedidos.length === 0) {
    listaPedidos.innerHTML = `<p class="carregando">Nenhum pedido ainda.</p>`;
    return;
  }

  listaPedidos.innerHTML = "";
  pedidos.forEach((pedido) => {
    listaPedidos.appendChild(criarCardPedido(pedido));
  });
}

function renderizarItensPedido(itens) {
  if (!itens || itens.length === 0) {
    return `<p class="card-pedido-item-vazio">Sem itens registrados.</p>`;
  }

  return itens
    .map((item) => {
      const icone = item.massa_id ? "🍝" : "🥤";
      const nomeComQtd = item.quantity > 1 ? `${item.product_name} (${item.quantity}x)` : item.product_name;
      const subtotalItem = Number(item.unit_price) * Number(item.quantity);

      const adicionais = item.order_item_adicionais || [];
      const adicionaisHtml = adicionais.length > 0
        ? `<div class="card-pedido-item-detalhe">➕ ${adicionais
            .map((a) => `${a.adicional_name} (${a.quantidade}x)`)
            .join(", ")}</div>`
        : "";

      const observacao = item.observacao || item.notes;
      const obsHtml = observacao ? `<div class="card-pedido-item-detalhe">📝 ${observacao}</div>` : "";

      return `
        <div class="card-pedido-item">
          <div class="card-pedido-item-topo">
            <span>${icone} ${nomeComQtd}</span>
            <span>R$ ${subtotalItem.toFixed(2)}</span>
          </div>
          ${adicionaisHtml}
          ${obsHtml}
        </div>
      `;
    })
    .join("");
}

function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card-pedido";

  const data = new Date(pedido.created_at).toLocaleString("pt-BR");
  const proximoStatus = STATUS_SEGUINTE[pedido.status];

  card.innerHTML = `
    <div class="card-pedido-numero">Pedido #${pedido.daily_number ?? "—"}</div>
    <div class="card-pedido-topo">
      <strong>${pedido.customer_name}</strong>
      <span class="status-badge status-${pedido.status}">${STATUS_LABEL[pedido.status]}</span>
    </div>
    <p class="card-pedido-info">📱 ${pedido.customer_whatsapp}</p>

    <div class="card-pedido-itens">
      ${renderizarItensPedido(pedido.order_items)}
    </div>

    <p class="card-pedido-info card-pedido-total">💰 Total: R$ ${Number(pedido.total).toFixed(2)}</p>
    <p class="card-pedido-info">🕒 ${data}</p>
    ${pedido.notes ? `<p class="card-pedido-info">📝 Obs. geral: ${pedido.notes}</p>` : ""}
    <div class="card-pedido-acoes"></div>
  `;

  const acoes = card.querySelector(".card-pedido-acoes");

  if (proximoStatus) {
    const btnAvancar = document.createElement("button");
    btnAvancar.className = "btn-primario btn-avancar";
    btnAvancar.textContent = `Marcar como ${STATUS_LABEL[proximoStatus]}`;
    btnAvancar.addEventListener("click", () => mudarStatus(pedido.id, proximoStatus));
    acoes.appendChild(btnAvancar);
  }

  if (pedido.status !== "CANCELADO" && pedido.status !== "ENTREGUE") {
    const btnCancelar = document.createElement("button");
    btnCancelar.className = "btn-cancelar";
    btnCancelar.textContent = "Cancelar";
    btnCancelar.addEventListener("click", () => mudarStatus(pedido.id, "CANCELADO"));
    acoes.appendChild(btnCancelar);
  }

  const btnImprimir = document.createElement("button");
  btnImprimir.className = "btn-primario btn-imprimir";
  btnImprimir.textContent = "🖨️ Imprimir";
  btnImprimir.addEventListener("click", () => imprimirPedido(pedido));
  acoes.appendChild(btnImprimir);

  const btnExcluir = document.createElement("button");
  btnExcluir.className = "btn-excluir";
  btnExcluir.textContent = "🗑️ Excluir";
  btnExcluir.addEventListener("click", () => excluirPedido(pedido.id, pedido.customer_name));
  acoes.appendChild(btnExcluir);

  return card;
}

async function excluirPedido(pedidoId, nomeCliente) {
  const confirmar = confirm(`Excluir definitivamente o pedido de "${nomeCliente}"? Essa ação não pode ser desfeita.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("orders").delete().eq("id", pedidoId);

  if (error) {
    alert("Erro ao excluir pedido: " + error.message);
    return;
  }

  carregarPedidos();
}

async function mudarStatus(pedidoId, novoStatus) {
  const { error } = await supabaseClient
    .from("orders")
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) {
    alert("Erro ao atualizar status: " + error.message);
    return;
  }

  carregarPedidos();
}

function imprimirPedido(pedido) {
  const data = new Date(pedido.created_at).toLocaleString("pt-BR");

  const itensTexto = (pedido.order_items || [])
    .map((item) => {
      const nomeQtd = item.quantity > 1 ? `${item.product_name} (${item.quantity}x)` : item.product_name;
      const subtotal = Number(item.unit_price) * Number(item.quantity);
      let linha = `${nomeQtd}\n   R$ ${subtotal.toFixed(2)}\n`;

      const adicionais = item.order_item_adicionais || [];
      if (adicionais.length > 0) {
        linha += `   + ${adicionais.map((a) => `${a.adicional_name} (${a.quantidade}x)`).join(", ")}\n`;
      }

      const observacao = item.observacao || item.notes;
      if (observacao) linha += `   Obs: ${observacao}\n`;

      return linha;
    })
    .join("");

  const texto =
    `TremBao\n` +
    `================================\n` +
    `Pedido #${pedido.daily_number ?? "-"}\n` +
    `${data}\n` +
    `================================\n` +
    `Cliente: ${pedido.customer_name}\n` +
    `WhatsApp: ${pedido.customer_whatsapp}\n` +
    `--------------------------------\n` +
    itensTexto +
    `--------------------------------\n` +
    (pedido.notes ? `Obs. geral: ${pedido.notes}\n--------------------------------\n` : "") +
    `TOTAL: R$ ${Number(pedido.total).toFixed(2)}\n` +
    `\n\n\n`;

  const base64 = btoa(unescape(encodeURIComponent(texto)));
  window.location.href = "rawbt:base64," + base64;
}