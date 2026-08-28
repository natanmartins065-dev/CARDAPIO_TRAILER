const formMassa = document.getElementById("form-massa");
const inputNomeMassa = document.getElementById("input-nome-massa");
const listaMassasAdmin = document.getElementById("lista-massas-admin");

verificarLoginEIniciar();

async function verificarLoginEIniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  carregarMassas();
}

formMassa.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = inputNomeMassa.value.trim();
  if (!nome) return;

  const { data: existentes } = await supabaseClient
    .from("massas")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const proximaOrdem = existentes && existentes.length > 0 ? existentes[0].display_order + 1 : 0;

  const { error } = await supabaseClient
    .from("massas")
    .insert({ name: nome, active: true, display_order: proximaOrdem });

  if (error) {
    alert("Erro ao adicionar massa: " + error.message);
    return;
  }

  inputNomeMassa.value = "";
  carregarMassas();
});

async function carregarMassas() {
  const { data: massas, error } = await supabaseClient
    .from("massas")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    listaMassasAdmin.innerHTML = `<p class="erro-cliente">Erro ao carregar massas: ${error.message}</p>`;
    return;
  }

  if (massas.length === 0) {
    listaMassasAdmin.innerHTML = `<p class="carregando">Nenhuma massa ainda.</p>`;
    return;
  }

  listaMassasAdmin.innerHTML = "";
  massas.forEach((massa) => {
    listaMassasAdmin.appendChild(criarCardMassa(massa));
  });
}

function criarCardMassa(massa) {
  const card = document.createElement("div");
  card.className = "card-produto";
  renderizarMassaVisualizacao(card, massa);
  return card;
}

function renderizarMassaVisualizacao(card, massa) {
  card.innerHTML = `
    <div class="card-produto-topo">
      <span class="card-produto-nome">${massa.name}</span>
      <button class="${massa.active ? 'badge-ativo' : 'badge-inativo'}">
        ${massa.active ? 'Ativo' : 'Inativo'}
      </button>
    </div>
    <div class="card-produto-acoes">
      <button class="btn-editar">Editar</button>
      <button class="btn-cancelar">Excluir</button>
    </div>
  `;

  card.querySelector(".badge-ativo, .badge-inativo").addEventListener("click", () =>
    alternarAtivoMassa(massa)
  );
  card.querySelector(".btn-editar").addEventListener("click", () =>
    renderizarMassaEdicao(card, massa)
  );
  card.querySelector(".btn-cancelar").addEventListener("click", () =>
    excluirMassa(massa.id, massa.name)
  );
}

function renderizarMassaEdicao(card, massa) {
  card.innerHTML = `
    <input type="text" class="campo-input edit-nome" value="${massa.name}">
    <div class="card-produto-acoes">
      <button class="btn-editar btn-salvar">Salvar</button>
      <button class="btn-cancelar btn-cancelar-edicao">Cancelar</button>
    </div>
  `;

  card.querySelector(".btn-salvar").addEventListener("click", async () => {
    const novoNome = card.querySelector(".edit-nome").value.trim();

    if (!novoNome) {
      alert("Preencha um nome.");
      return;
    }

    const { error } = await supabaseClient
      .from("massas")
      .update({ name: novoNome })
      .eq("id", massa.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    carregarMassas();
  });

  card.querySelector(".btn-cancelar-edicao").addEventListener("click", () => {
    renderizarMassaVisualizacao(card, massa);
  });
}

async function alternarAtivoMassa(massa) {
  const { error } = await supabaseClient
    .from("massas")
    .update({ active: !massa.active })
    .eq("id", massa.id);

  if (error) {
    alert("Erro ao atualizar: " + error.message);
    return;
  }

  carregarMassas();
}

async function excluirMassa(id, nome) {
  const confirmar = confirm(`Excluir a massa "${nome}"? Isso só funciona se ela nunca tiver sido pedida.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("massas").delete().eq("id", id);

  if (error) {
    alert("Não foi possível excluir. Provavelmente essa massa já apareceu em algum pedido. Detalhe: " + error.message);
    return;
  }

  carregarMassas();
}