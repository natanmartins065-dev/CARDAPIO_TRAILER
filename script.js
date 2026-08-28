const ID_CATEGORIA_BEBIDAS = "b56f9fc8-cb48-4b58-818c-bb0524cd6c57";

// TELA DE ABERTURA (QR CODE) — só aparece na primeira visita do cliente
const CHAVE_JA_ABRIU = "cardapioJaAberto";
const telaAbertura = document.getElementById("tela-abertura");
const btnAbrirCardapio = document.getElementById("btn-abrir-cardapio");
const appCardapio = document.getElementById("app-cardapio");

if (localStorage.getItem(CHAVE_JA_ABRIU)) {
  // Já visitou antes: pula direto pro cardápio, sem animação
  telaAbertura.remove();
  appCardapio.classList.remove("escondido");
  appCardapio.classList.add("mostrando");
} else {
  btnAbrirCardapio.addEventListener("click", () => {
    localStorage.setItem(CHAVE_JA_ABRIU, "1");
    telaAbertura.classList.add("abrindo");
    appCardapio.classList.remove("escondido");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        appCardapio.classList.add("mostrando");
      });
    });

    setTimeout(() => {
      telaAbertura.remove();
    }, 650);
  });
}

// ESTADO DO PEDIDO
let massas = [];
let molhos = [];
let bebidas = [];
let adicionais = [];
let outrosProdutos = [];
let carrinho = [];

let massaSelecionada = null;
let molhoSelecionado = null;
let tamanhoSelecionado = null;
let contadorAdicionais = {}; // { adicionalId: quantidade }

// ELEMENTOS
const listaAdicionais = document.getElementById("lista-adicionais");
const listaMassas = document.getElementById("lista-massas");
const listaMolhos = document.getElementById("lista-molhos");
const listaBebidas = document.getElementById("lista-bebidas");
const listaOutrosProdutos = document.getElementById("lista-outros-produtos");
const separadorOutrosProdutos = document.getElementById("separador-outros-produtos");
const observacaoMolho = document.getElementById("observacao-molho");
const btnAddCarrinho = document.getElementById("btn-add-carrinho");
const btnPularBebida = document.getElementById("btn-pular-bebida");
const btnPedirOutro = document.getElementById("btn-pedir-outro");
const btnFinalizar = document.getElementById("btn-finalizar");
const btnConfirmarPedido = document.getElementById("btn-confirmar-pedido");
const resumoPedido = document.getElementById("resumo-pedido");
const itensCarrinho = document.getElementById("itens-carrinho");
const totalCarrinho = document.getElementById("total-carrinho");
const passoDadosCliente = document.getElementById("passo-dados-cliente");
const inputNomeCliente = document.getElementById("input-nome-cliente");
const inputWhatsappCliente = document.getElementById("input-whatsapp-cliente");
const btnVoltarMolho = document.getElementById("btn-voltar-molho");
const btnVoltarBebida = document.getElementById("btn-voltar-bebida");
const btnVoltarResumo = document.getElementById("btn-voltar-resumo");

iniciar();

async function iniciar() {
  await carregarDados();
  renderizarMassas();
  renderizarOutrosProdutos();
}

async function carregarDados() {
  const [resMassas, resMolhos, resBebidas, resAdicionais, resOutros] = await Promise.all([
    supabaseClient.from("massas").select("*").eq("active", true).order("display_order"),
    supabaseClient.from("molhos").select("*").eq("active", true).order("display_order"),
    supabaseClient
      .from("products")
      .select("*")
      .eq("category_id", ID_CATEGORIA_BEBIDAS)
      .eq("is_active", true)
      .order("display_order"),
    supabaseClient.from("adicionais").select("*").eq("active", true).order("display_order"),
    supabaseClient
      .from("products")
      .select("*")
      .neq("category_id", ID_CATEGORIA_BEBIDAS)
      .eq("is_active", true)
      .order("display_order")
  ]);

  massas = resMassas.data || [];
  molhos = resMolhos.data || [];
  bebidas = resBebidas.data || [];
  adicionais = resAdicionais.data || [];
  outrosProdutos = resOutros.data || [];
}

// PASSO 1: MASSAS
function renderizarMassas() {
  if (massas.length === 0) {
    listaMassas.innerHTML = `<p class="carregando">Nenhuma massa disponível.</p>`;
    return;
  }

  listaMassas.innerHTML = "";
  massas.forEach((massa) => {
    const card = document.createElement("div");
    card.className = "card-opcao card-massa";
    card.innerHTML = `
      <div class="card-massa-foto" style="background-image: url('${massa.image_url || ''}')"></div>
      <div class="card-opcao-nome">${massa.name}</div>
    `;
    card.addEventListener("click", () => {
      massaSelecionada = massa;
      irParaPasso(2);
      renderizarMolhos();
    });
    listaMassas.appendChild(card);
  });
}

function renderizarOutrosProdutos() {
  if (outrosProdutos.length === 0) {
    listaOutrosProdutos.innerHTML = "";
    separadorOutrosProdutos.classList.add("escondido");
    return;
  }

  separadorOutrosProdutos.classList.remove("escondido");
  listaOutrosProdutos.innerHTML = "";

  outrosProdutos.forEach((produto) => {
    const card = document.createElement("div");
    card.className = "card-opcao";
    card.innerHTML = `
      <div class="card-opcao-nome">${produto.name}</div>
      ${produto.description ? `<div class="card-opcao-desc">${produto.description}</div>` : ""}
      <div class="card-opcao-desc card-opcao-preco">R$ ${Number(produto.price).toFixed(2)}</div>
    `;
    card.addEventListener("click", () => {
      carrinho.push({
        tipo: "prato",
        product_id: produto.id,
        nome: produto.name,
        preco: Number(produto.price)
      });
      renderizarCarrinho();
      irParaPasso(3);
      renderizarBebidas();
    });
    listaOutrosProdutos.appendChild(card);
  });
}

// PASSO 2: MOLHOS
function renderizarMolhos(manterSelecao = false) {
  if (!manterSelecao) {
    molhoSelecionado = null;
    tamanhoSelecionado = null;
    observacaoMolho.value = "";
    contadorAdicionais = {};
    btnAddCarrinho.disabled = true;
  }

  if (molhos.length === 0) {
    listaMolhos.innerHTML = `<p class="carregando">Nenhum molho disponível.</p>`;
    return;
  }

  listaMolhos.innerHTML = "";
  molhos.forEach((molho) => {
    const card = document.createElement("div");
    card.className = "card-opcao";
    card.innerHTML = `
      <div class="card-opcao-nome">${molho.name}</div>
      <div class="card-opcao-desc">${molho.description || ""}</div>
      <div class="card-opcao-precos">
        <div class="opcao-tamanho" data-tamanho="P">P — R$ ${Number(molho.preco_p).toFixed(2)}</div>
        <div class="opcao-tamanho" data-tamanho="G">G — R$ ${Number(molho.preco_g).toFixed(2)}</div>
      </div>
    `;

    const botoesTamanho = card.querySelectorAll(".opcao-tamanho");
    botoesTamanho.forEach((botao) => {
      botao.addEventListener("click", (e) => {
        e.stopPropagation();

        document.querySelectorAll(".card-opcao").forEach((c) => c.classList.remove("selecionado"));
        document.querySelectorAll(".opcao-tamanho").forEach((b) => b.classList.remove("selecionado"));

        card.classList.add("selecionado");
        botao.classList.add("selecionado");

        molhoSelecionado = molho;
        tamanhoSelecionado = botao.dataset.tamanho;
        btnAddCarrinho.disabled = false;
      });

      // Se voltamos de outro passo e esse já era o molho/tamanho escolhido, marca de novo como selecionado
      if (manterSelecao && molhoSelecionado && molho.id === molhoSelecionado.id && botao.dataset.tamanho === tamanhoSelecionado) {
        card.classList.add("selecionado");
        botao.classList.add("selecionado");
      }
    });

    listaMolhos.appendChild(card);
  });

  renderizarAdicionais();
}

// ADICIONAIS (dentro do passo 2)
function renderizarAdicionais() {
  if (adicionais.length === 0) {
    listaAdicionais.innerHTML = `<p class="carregando">Nenhum adicional disponível.</p>`;
    return;
  }

  listaAdicionais.innerHTML = "";
  adicionais.forEach((adicional) => {
    const card = document.createElement("div");
    card.className = "card-opcao card-adicional";
    card.dataset.adicionalId = adicional.id;
    card.innerHTML = `
      <div class="controles-bebida escondido">
        <button type="button" class="remover-bebida" data-adicional-id="${adicional.id}">−</button>
        <span class="contador-bebida">0x</span>
      </div>
      <div class="card-opcao-nome">${adicional.name}</div>
      <div class="card-opcao-desc">R$ ${Number(adicional.price).toFixed(2)}</div>
    `;
    card.addEventListener("click", () => {
      adicionarOuIncrementarAdicional(adicional);
    });
    card.querySelector(".remover-bebida").addEventListener("click", (e) => {
      e.stopPropagation();
      removerUnidadeAdicional(adicional);
    });
    listaAdicionais.appendChild(card);
  });

  atualizarBadgesAdicionais();
}

function adicionarOuIncrementarAdicional(adicional) {
  contadorAdicionais[adicional.id] = (contadorAdicionais[adicional.id] || 0) + 1;
  atualizarBadgesAdicionais();
}

function removerUnidadeAdicional(adicional) {
  if (!contadorAdicionais[adicional.id]) return;

  contadorAdicionais[adicional.id]--;
  if (contadorAdicionais[adicional.id] <= 0) {
    delete contadorAdicionais[adicional.id];
  }

  atualizarBadgesAdicionais();
}

function atualizarBadgesAdicionais() {
  document.querySelectorAll("#lista-adicionais .card-opcao").forEach((card) => {
    const id = card.dataset.adicionalId;
    const controles = card.querySelector(".controles-bebida");
    const badge = card.querySelector(".contador-bebida");
    const quantidade = contadorAdicionais[id] || 0;

    card.classList.toggle("selecionado", quantidade > 0);
    controles.classList.toggle("escondido", quantidade === 0);
    badge.textContent = `${quantidade}x`;
  });
}

btnAddCarrinho.addEventListener("click", () => {
  if (!massaSelecionada || !molhoSelecionado || !tamanhoSelecionado) return;

  const precoBase = tamanhoSelecionado === "P" ? molhoSelecionado.preco_p : molhoSelecionado.preco_g;

  const adicionaisEscolhidos = Object.entries(contadorAdicionais)
    .filter(([, quantidade]) => quantidade > 0)
    .map(([adicionalId, quantidade]) => {
      const adicional = adicionais.find((a) => a.id === adicionalId);
      return {
        adicional_id: adicionalId,
        nome: adicional ? adicional.name : "Adicional",
        preco_unitario: adicional ? Number(adicional.price) : 0,
        quantidade
      };
    });

  const precoAdicionais = adicionaisEscolhidos.reduce(
    (soma, item) => soma + item.preco_unitario * item.quantidade,
    0
  );

  carrinho.push({
    tipo: "macarrao",
    massa_id: massaSelecionada.id,
    molho_id: molhoSelecionado.id,
    nome: `${massaSelecionada.name} + ${molhoSelecionado.name} (${tamanhoSelecionado})`,
    tamanho: tamanhoSelecionado,
    observacao: observacaoMolho.value.trim() || null,
    adicionais: adicionaisEscolhidos,
    preco: Number(precoBase) + precoAdicionais
  });

  renderizarCarrinho();
  irParaPasso(3);
  renderizarBebidas();
});

// PASSO 3: BEBIDAS
function renderizarBebidas() {
  if (bebidas.length === 0) {
    listaBebidas.innerHTML = `<p class="carregando">Nenhuma bebida disponível.</p>`;
    return;
  }

  listaBebidas.innerHTML = "";
  bebidas.forEach((bebida) => {
    const card = document.createElement("div");
    card.className = "card-opcao card-bebida";
    card.dataset.bebidaId = bebida.id;
    card.innerHTML = `
      <div class="controles-bebida escondido">
        <button type="button" class="remover-bebida" data-bebida-id="${bebida.id}">−</button>
        <span class="contador-bebida">0x</span>
      </div>
      <div class="card-opcao-nome">${bebida.name}</div>
      <div class="card-opcao-desc">R$ ${Number(bebida.price).toFixed(2)}</div>
    `;
    card.addEventListener("click", () => {
      adicionarOuIncrementarBebida(bebida);
    });
    card.querySelector(".remover-bebida").addEventListener("click", (e) => {
      e.stopPropagation(); // evita que o clique "vaze" pro card e conte como adicionar
      removerUnidadeBebida(bebida);
    });
    listaBebidas.appendChild(card);
  });

  atualizarBadgesBebidas();
}

// Acha a partir de onde começam as bebidas da rodada atual
// (tudo que está no fim do carrinho, depois do último macarrão)
function indiceInicioRodadaBebidas() {
  let i = carrinho.length;
  while (i > 0 && carrinho[i - 1].tipo === "produto") i--;
  return i;
}

function adicionarOuIncrementarBebida(bebida) {
  const inicio = indiceInicioRodadaBebidas();
  let item = null;

  for (let i = inicio; i < carrinho.length; i++) {
    if (carrinho[i].product_id === bebida.id) {
      item = carrinho[i];
      break;
    }
  }

  if (item) {
    item.quantidade++;
    item.preco = item.precoUnitario * item.quantidade;
  } else {
    carrinho.push({
      tipo: "produto",
      product_id: bebida.id,
      nome: bebida.name,
      precoUnitario: Number(bebida.price),
      quantidade: 1,
      preco: Number(bebida.price)
    });
  }

  renderizarCarrinho();
  atualizarBadgesBebidas();
}

function removerUnidadeBebida(bebida) {
  const inicio = indiceInicioRodadaBebidas();

  for (let i = carrinho.length - 1; i >= inicio; i--) {
    if (carrinho[i].product_id === bebida.id) {
      carrinho[i].quantidade--;
      if (carrinho[i].quantidade <= 0) {
        carrinho.splice(i, 1);
      } else {
        carrinho[i].preco = carrinho[i].precoUnitario * carrinho[i].quantidade;
      }
      break;
    }
  }

  renderizarCarrinho();
  atualizarBadgesBebidas();
}

function atualizarBadgesBebidas() {
  const inicio = indiceInicioRodadaBebidas();
  const quantidades = {};

  for (let i = inicio; i < carrinho.length; i++) {
    quantidades[carrinho[i].product_id] = carrinho[i].quantidade;
  }

  document.querySelectorAll("#lista-bebidas .card-opcao").forEach((card) => {
    const id = card.dataset.bebidaId;
    const controles = card.querySelector(".controles-bebida");
    const badge = card.querySelector(".contador-bebida");
    const quantidade = quantidades[id] || 0;

    card.classList.toggle("selecionado", quantidade > 0);
    controles.classList.toggle("escondido", quantidade === 0);
    badge.textContent = `${quantidade}x`;
  });
}

btnPularBebida.addEventListener("click", () => {
  mostrarSoResumo();
});

btnVoltarMolho.addEventListener("click", () => {
  irParaPasso(1);
});

btnVoltarBebida.addEventListener("click", () => {
  // Remove qualquer bebida já escolhida nessa rodada
  while (carrinho.length > 0 && carrinho[carrinho.length - 1].tipo === "produto") {
    carrinho.pop();
  }

  const ultimoItem = carrinho[carrinho.length - 1];

  if (ultimoItem && ultimoItem.tipo === "macarrao") {
    // Veio de massa + molho: volta pro molho, mantendo a seleção
    carrinho.pop();
    renderizarCarrinho();
    irParaPasso(2);
    renderizarMolhos(true);
  } else if (ultimoItem && ultimoItem.tipo === "prato") {
    // Veio de um prato à parte (ex: Salada de Macarrão): volta pra tela de massa
    carrinho.pop();
    renderizarCarrinho();
    irParaPasso(1);
    renderizarMassas();
  } else {
    renderizarCarrinho();
    irParaPasso(1);
    renderizarMassas();
  }
});

btnVoltarResumo.addEventListener("click", () => {
  // Remove todas as bebidas adicionadas nessa rodada (podem ser várias agora)
  while (carrinho.length > 0 && carrinho[carrinho.length - 1].tipo === "produto") {
    carrinho.pop();
  }
  renderizarCarrinho();
  irParaPasso(3);
  renderizarBebidas();
});

function mostrarSoResumo() {
  document.getElementById("progresso-quiz").classList.add("escondido");
  document.querySelectorAll(".passo-quiz[data-passo]").forEach((s) => s.classList.add("escondido"));
  renderizarCarrinho();
}

btnPedirOutro.addEventListener("click", () => {
  voltarParaPasso1();
});

function voltarParaPasso1() {
  massaSelecionada = null;
  molhoSelecionado = null;
  tamanhoSelecionado = null;
  irParaPasso(1);
  renderizarMassas();
}

// NAVEGAÇÃO ENTRE PASSOS
function irParaPasso(numero) {
  document.getElementById("progresso-quiz").classList.remove("escondido");

  document.querySelectorAll(".passo-quiz[data-passo]").forEach((secao) => {
    secao.classList.toggle("escondido", Number(secao.dataset.passo) !== numero);
  });

  document.querySelectorAll(".progresso-passo").forEach((bolinha) => {
    const passoBolinha = Number(bolinha.dataset.passo);
    bolinha.classList.toggle("ativo", passoBolinha === numero);
    bolinha.classList.toggle("concluido", passoBolinha < numero);
  });
}

// CARRINHO / RESUMO
function renderizarCarrinho() {
  if (carrinho.length === 0) {
    resumoPedido.classList.add("escondido");

    // Se esvaziou o carrinho enquanto estava na tela "só resumo" (fora do quiz), reinicia o fluxo
    const dentroDoQuiz = !document.getElementById("progresso-quiz").classList.contains("escondido");
    if (!dentroDoQuiz) {
      voltarParaPasso1();
    }
    return;
  }

  resumoPedido.classList.remove("escondido");
  itensCarrinho.innerHTML = "";

  let total = 0;

  carrinho.forEach((item, index) => {
    total += item.preco;

    const linha = document.createElement("div");
    linha.className = "item-carrinho";
        linha.innerHTML = `
      <div>
        <div class="item-carrinho-nome">${item.nome}${item.quantidade > 1 ? ` (${item.quantidade}x)` : ""}</div>
        ${item.adicionais && item.adicionais.length > 0 ? `<div class="item-carrinho-obs">Adicionais: ${item.adicionais.map((a) => `${a.nome} (${a.quantidade}x)`).join(", ")}</div>` : ""}
        ${item.observacao ? `<div class="item-carrinho-obs">Obs: ${item.observacao}</div>` : ""}
      </div>
      <div style="text-align: right;">
        <div>R$ ${item.preco.toFixed(2)}</div>
        <button class="item-carrinho-remover" data-index="${index}">remover</button>
      </div>
    `;
    itensCarrinho.appendChild(linha);
  });

  totalCarrinho.textContent = `R$ ${total.toFixed(2)}`;

  document.querySelectorAll(".item-carrinho-remover").forEach((botao) => {
    botao.addEventListener("click", (e) => {
      const index = Number(e.target.dataset.index);
      carrinho.splice(index, 1);
      renderizarCarrinho();
      atualizarBadgesBebidas();
    });
  });
}

// FINALIZAR PEDIDO
btnFinalizar.addEventListener("click", () => {
  if (carrinho.length === 0) return;
  document.querySelectorAll(".passo-quiz[data-passo]").forEach((s) => s.classList.add("escondido"));
  document.getElementById("progresso-quiz").classList.add("escondido");
  resumoPedido.classList.add("escondido");
  passoDadosCliente.classList.remove("escondido");
});

btnConfirmarPedido.addEventListener("click", async () => {
  const nome = inputNomeCliente.value.trim();
  const whatsapp = inputWhatsappCliente.value.trim();

  if (!nome || !whatsapp) {
    alert("Preencha seu nome e WhatsApp para continuar.");
    return;
  }

  const itemsParaEnviar = carrinho.map((item) => {
    if (item.tipo === "macarrao") {
      return {
        tipo: "macarrao",
        massaId: item.massa_id,
        molhoId: item.molho_id,
        tamanho: item.tamanho,
        observacao: item.observacao,
        adicionais: item.adicionais.map((a) => ({
          adicionalId: a.adicional_id,
          quantidade: a.quantidade
        }))
      };
    } else {
      return {
        tipo: "produto",
        productId: item.product_id,
        quantidade: item.quantidade || 1
      };
    }
  });

  btnConfirmarPedido.disabled = true;
  btnConfirmarPedido.textContent = "Enviando...";
  // guardamos o texto original aqui perto do uso, pra facilitar achar se ele mudar de novo no futuro

  try {
    const resposta = await fetch(CREATE_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        customerName: nome,
        customerWhatsapp: whatsapp,
        items: itemsParaEnviar
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.error || "Erro desconhecido");
    }

    alert(`Pedido feito com sucesso! Total: R$ ${Number(resultado.total).toFixed(2)}\n\nPague na maquininha ao retirar seu pedido no trailer. 😊`);
    resetarAppAposPedido();

  } catch (erro) {
    alert("Não foi possível enviar seu pedido: " + erro.message);
    btnConfirmarPedido.disabled = false;
    btnConfirmarPedido.textContent = "Confirmar pedido";
  }
});

function resetarAppAposPedido() {
  carrinho = [];
  massaSelecionada = null;
  molhoSelecionado = null;
  tamanhoSelecionado = null;
  contadorAdicionais = {};
  inputNomeCliente.value = "";
  inputWhatsappCliente.value = "";
  btnConfirmarPedido.disabled = false;
  btnConfirmarPedido.textContent = "Confirmar pedido";

  passoDadosCliente.classList.add("escondido");
  resumoPedido.classList.add("escondido");

  irParaPasso(1);
  renderizarMassas();
}