const formAdicional = document.getElementById("form-adicional");
const inputNomeAdicional = document.getElementById("input-nome-adicional");
const inputPrecoAdicional = document.getElementById("input-preco-adicional");
const listaAdicionaisAdmin = document.getElementById("lista-adicionais-admin");

verificarLoginEIniciar();


supabaseClient.auth.onAuthStateChange((evento, sessao) => {
  if (evento === "SIGNED_OUT" || !sessao) {
    window.location.href = "login.html";
  }
});

async function verificarLoginEIniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  carregarAdicionais();
}

formAdicional.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = inputNomeAdicional.value.trim();
  const preco = parseFloat(inputPrecoAdicional.value);

  if (!nome || isNaN(preco)) {
    alert("Preencha nome e preço corretamente.");
    return;
  }

  const { data: existentes } = await supabaseClient
    .from("adicionais")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const proximaOrdem = existentes && existentes.length > 0 ? existentes[0].display_order + 1 : 0;

  const { error } = await supabaseClient
    .from("adicionais")
    .insert({ name: nome, price: preco, active: true, display_order: proximaOrdem });

  if (error) {
    alert("Erro ao adicionar adicional: " + error.message);
    return;
  }

  formAdicional.reset();
  carregarAdicionais();
});

async function carregarAdicionais() {
  const { data: adicionais, error } = await supabaseClient
    .from("adicionais")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    listaAdicionaisAdmin.innerHTML = `<p class="erro-cliente">Erro ao carregar adicionais: ${error.message}</p>`;
    return;
  }

  if (adicionais.length === 0) {
    listaAdicionaisAdmin.innerHTML = `<p class="carregando">Nenhum adicional ainda.</p>`;
    return;
  }

  listaAdicionaisAdmin.innerHTML = "";
  adicionais.forEach((adicional) => {
    listaAdicionaisAdmin.appendChild(criarCardAdicional(adicional));
  });
}

function criarCardAdicional(adicional) {
  const card = document.createElement("div");
  card.className = "card-produto";
  renderizarAdicionalVisualizacao(card, adicional);
  return card;
}

function renderizarAdicionalVisualizacao(card, adicional) {
  card.innerHTML = `
    <div class="card-produto-topo">
      <span class="card-produto-nome">${adicional.name}</span>
      <button class="${adicional.active ? 'badge-ativo' : 'badge-inativo'}">
        ${adicional.active ? 'Ativo' : 'Inativo'}
      </button>
    </div>
    <div class="card-produto-desc">R$ ${Number(adicional.price).toFixed(2)}</div>
    <div class="card-produto-acoes">
      <button class="btn-editar">Editar</button>
      <button class="btn-cancelar">Excluir</button>
    </div>
  `;

  card.querySelector(".badge-ativo, .badge-inativo").addEventListener("click", () =>
    alternarAtivoAdicional(adicional)
  );
  card.querySelector(".btn-editar").addEventListener("click", () =>
    renderizarAdicionalEdicao(card, adicional)
  );
  card.querySelector(".btn-cancelar").addEventListener("click", () =>
    excluirAdicional(adicional.id, adicional.name)
  );
}

function renderizarAdicionalEdicao(card, adicional) {
  card.innerHTML = `
    <input type="text" class="campo-input edit-nome" value="${adicional.name}">
    <input type="number" class="campo-input edit-preco" value="${adicional.price}" step="0.01" min="0" placeholder="Preço">
    <div class="card-produto-acoes">
      <button class="btn-editar btn-salvar">Salvar</button>
      <button class="btn-cancelar btn-cancelar-edicao">Cancelar</button>
    </div>
  `;

  card.querySelector(".btn-salvar").addEventListener("click", async () => {
    const novoNome = card.querySelector(".edit-nome").value.trim();
    const novoPreco = parseFloat(card.querySelector(".edit-preco").value);

    if (!novoNome || isNaN(novoPreco)) {
      alert("Preencha nome e preço corretamente.");
      return;
    }

    const { error } = await supabaseClient
      .from("adicionais")
      .update({ name: novoNome, price: novoPreco })
      .eq("id", adicional.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    carregarAdicionais();
  });

  card.querySelector(".btn-cancelar-edicao").addEventListener("click", () => {
    renderizarAdicionalVisualizacao(card, adicional);
  });
}

async function alternarAtivoAdicional(adicional) {
  const { error } = await supabaseClient
    .from("adicionais")
    .update({ active: !adicional.active })
    .eq("id", adicional.id);

  if (error) {
    alert("Erro ao atualizar: " + error.message);
    return;
  }

  carregarAdicionais();
}

async function excluirAdicional(id, nome) {
  const confirmar = confirm(`Excluir o adicional "${nome}"? Isso só funciona se ele nunca tiver sido pedido.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("adicionais").delete().eq("id", id);

  if (error) {
    alert("Não foi possível excluir. Provavelmente esse adicional já apareceu em algum pedido. Detalhe: " + error.message);
    return;
  }

  carregarAdicionais();
}