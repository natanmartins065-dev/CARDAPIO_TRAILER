const formMolho = document.getElementById("form-molho");
const inputNomeMolho = document.getElementById("input-nome-molho");
const inputDescricaoMolho = document.getElementById("input-descricao-molho");
const inputPrecoPMolho = document.getElementById("input-preco-p-molho");
const inputPrecoGMolho = document.getElementById("input-preco-g-molho");
const listaMolhosAdmin = document.getElementById("lista-molhos-admin");

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

  carregarMolhos();
}

formMolho.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = inputNomeMolho.value.trim();
  const descricao = inputDescricaoMolho.value.trim();
  const precoP = parseFloat(inputPrecoPMolho.value);
  const precoG = parseFloat(inputPrecoGMolho.value);

  if (!nome || isNaN(precoP) || isNaN(precoG)) {
    alert("Preencha nome e os dois preços corretamente.");
    return;
  }

  const { data: existentes } = await supabaseClient
    .from("molhos")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const proximaOrdem = existentes && existentes.length > 0 ? existentes[0].display_order + 1 : 0;

  const { error } = await supabaseClient
    .from("molhos")
    .insert({ name: nome, description: descricao || null, preco_p: precoP, preco_g: precoG, active: true, display_order: proximaOrdem });

  if (error) {
    alert("Erro ao adicionar molho: " + error.message);
    return;
  }

  formMolho.reset();
  carregarMolhos();
});

async function carregarMolhos() {
  const { data: molhos, error } = await supabaseClient
    .from("molhos")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    listaMolhosAdmin.innerHTML = `<p class="erro-cliente">Erro ao carregar molhos: ${error.message}</p>`;
    return;
  }

  if (molhos.length === 0) {
    listaMolhosAdmin.innerHTML = `<p class="carregando">Nenhum molho ainda.</p>`;
    return;
  }

  listaMolhosAdmin.innerHTML = "";
  molhos.forEach((molho) => {
    listaMolhosAdmin.appendChild(criarCardMolho(molho));
  });
}

function criarCardMolho(molho) {
  const card = document.createElement("div");
  card.className = "card-produto";
  renderizarMolhoVisualizacao(card, molho);
  return card;
}

function renderizarMolhoVisualizacao(card, molho) {
  card.innerHTML = `
    <div class="card-produto-topo">
      <span class="card-produto-nome">${molho.name}</span>
      <button class="${molho.active ? 'badge-ativo' : 'badge-inativo'}">
        ${molho.active ? 'Ativo' : 'Inativo'}
      </button>
    </div>
    ${molho.description ? `<div class="card-produto-desc">${molho.description}</div>` : ""}
    <div class="card-produto-desc">P — R$ ${Number(molho.preco_p).toFixed(2)} &nbsp;|&nbsp; G — R$ ${Number(molho.preco_g).toFixed(2)}</div>
    <div class="card-produto-acoes">
      <button class="btn-editar">Editar</button>
      <button class="btn-cancelar">Excluir</button>
    </div>
  `;

  card.querySelector(".badge-ativo, .badge-inativo").addEventListener("click", () =>
    alternarAtivoMolho(molho)
  );
  card.querySelector(".btn-editar").addEventListener("click", () =>
    renderizarMolhoEdicao(card, molho)
  );
  card.querySelector(".btn-cancelar").addEventListener("click", () =>
    excluirMolho(molho.id, molho.name)
  );
}

function renderizarMolhoEdicao(card, molho) {
  card.innerHTML = `
    <input type="text" class="campo-input edit-nome" value="${molho.name}">
    <input type="text" class="campo-input edit-descricao" value="${molho.description || ""}" placeholder="Descrição">
    <input type="number" class="campo-input edit-preco-p" value="${molho.preco_p}" step="0.01" min="0" placeholder="Preço P">
    <input type="number" class="campo-input edit-preco-g" value="${molho.preco_g}" step="0.01" min="0" placeholder="Preço G">
    <div class="card-produto-acoes">
      <button class="btn-editar btn-salvar">Salvar</button>
      <button class="btn-cancelar btn-cancelar-edicao">Cancelar</button>
    </div>
  `;

  card.querySelector(".btn-salvar").addEventListener("click", async () => {
    const novoNome = card.querySelector(".edit-nome").value.trim();
    const novaDescricao = card.querySelector(".edit-descricao").value.trim();
    const novoPrecoP = parseFloat(card.querySelector(".edit-preco-p").value);
    const novoPrecoG = parseFloat(card.querySelector(".edit-preco-g").value);

    if (!novoNome || isNaN(novoPrecoP) || isNaN(novoPrecoG)) {
      alert("Preencha nome e os dois preços corretamente.");
      return;
    }

    const { error } = await supabaseClient
      .from("molhos")
      .update({ name: novoNome, description: novaDescricao || null, preco_p: novoPrecoP, preco_g: novoPrecoG })
      .eq("id", molho.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    carregarMolhos();
  });

  card.querySelector(".btn-cancelar-edicao").addEventListener("click", () => {
    renderizarMolhoVisualizacao(card, molho);
  });
}

async function alternarAtivoMolho(molho) {
  const { error } = await supabaseClient
    .from("molhos")
    .update({ active: !molho.active })
    .eq("id", molho.id);

  if (error) {
    alert("Erro ao atualizar: " + error.message);
    return;
  }

  carregarMolhos();
}

async function excluirMolho(id, nome) {
  const confirmar = confirm(`Excluir o molho "${nome}"? Isso só funciona se ele nunca tiver sido pedido.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("molhos").delete().eq("id", id);

  if (error) {
    alert("Não foi possível excluir. Provavelmente esse molho já apareceu em algum pedido. Detalhe: " + error.message);
    return;
  }

  carregarMolhos();
}