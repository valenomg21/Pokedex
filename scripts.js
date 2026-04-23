function changeTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');

    const titles = { info: 'Información', stats: 'Stats / Combate', evoluciones: 'Evoluciones' };
    document.getElementById('tab-title').innerText = titles[tabId] || tabId;
}

const tiposTraducidos = {
    normal: 'Normal', fighting: 'Lucha', flying: 'Volador',
    poison: 'Veneno', ground: 'Tierra', rock: 'Roca',
    bug: 'Bicho', ghost: 'Fantasma', steel: 'Acero',
    fire: 'Fuego', water: 'Agua', grass: 'Planta',
    electric: 'Eléctrico', psychic: 'Psíquico', ice: 'Hielo',
    dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada'
};

const tipoColores = {
    normal:   '#9da0aa', fighting: '#c03028', flying:   '#89aad8',
    poison:   '#a040a0', ground:   '#e0c068', rock:     '#b8a038',
    bug:      '#a8b820', ghost:    '#705898', steel:    '#b8b8d0',
    fire:     '#f08030', water:    '#6890f0', grass:    '#78c850',
    electric: '#f8d030', psychic:  '#f85888', ice:      '#98d8d8',
    dragon:   '#7038f8', dark:     '#705848', fairy:    '#ee99ac'
};

let cryUrl = null
let spriteNormal = null; 
let spriteShiny = null; 
let isShiny = false;    

document.getElementById('poke-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        let query = this.value.toLowerCase().trim();
        if (query !== '') {
            const luzCeleste = document.querySelector('.big-light');
            if (luzCeleste) {
                luzCeleste.classList.add('iluminar');
                setTimeout(() => luzCeleste.classList.remove('iluminar'), 400);
            }
            buscarPokemon(query);
        }
   }
});

async function buscarPokemon(query) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
        if (!response.ok) throw new Error('No encontrado');
        const data = await response.json();
        actualizarPokedex(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('poke-name').innerText = 'No encontrado';
    }
}

function actualizarPokedex(data) {
    let nombre = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    document.getElementById('poke-name').innerText = nombre;

    const imgSrc = data.sprites.front_default;
    document.getElementById('poke-image').src      = imgSrc;
    document.getElementById('poke-image-info').src = imgSrc;

    document.getElementById('poke-id').innerText     = '#' + data.id.toString().padStart(3, '0');
    document.getElementById('poke-weight').innerText = (data.weight / 10) + ' kg';
    document.getElementById('poke-height').innerText = (data.height / 10) + ' m';
    document.getElementById('poke-types').innerText  =
        data.types.map(t => tiposTraducidos[t.type.name] || t.type.name).join(', ');

    const statsMap = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    data.stats.forEach((stat, i) => {
        const val   = stat.base_stat;
        const barEl = document.getElementById('stat-' + statsMap[i]);
        const numEl = document.getElementById('stat-' + statsMap[i] + '-num');
        if (barEl) barEl.style.width = Math.min((val / 255) * 100, 100) + '%';
        if (numEl) numEl.innerText   = val;
    });

    if (data.moves.length > 0) {
        let move = data.moves[Math.floor(Math.random() * data.moves.length)].move.name;
        document.getElementById('poke-move').innerText =
            move.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    spriteNormal = data.sprites.front_default;
    spriteShiny = data.sprites.front_shiny;
    isShiny = false;
    document.querySelector('.shiny-btn').classList.remove('active');
    document.getElementById('poke-image').src = spriteNormal;

    cryUrl = data.cries?.latest || data.cries?.legacy || null

    buscarDescription(data.id);
    buscarCombate(data.types);
}

function reproducirSonido() {
    if (!cryUrl) return 
    const sonido = new Audio(cryUrl)
    sonido.volume = 0.1;
    sonido.play()
}

function toggleShiny() {
    if (!spriteShiny) return; 

    isShiny = !isShiny;
    const imgPokemon = document.getElementById('poke-image');
    const btnShiny = document.querySelector('.shiny-btn');

    if (isShiny) {
        imgPokemon.src = spriteShiny;
        btnShiny.classList.add('active');
    } else {
        imgPokemon.src = spriteNormal;
        btnShiny.classList.remove('active');
    }
}

async function buscarDescription(id) {
    try {
        const res  = await fetch('https://pokeapi.co/api/v2/pokemon-species/' + id);
        const data = await res.json();

        const entry = data.flavor_text_entries.find(e => e.language.name === 'es');
        document.getElementById('poke-desc').innerText = entry
            ? entry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ')
            : 'Descripción no disponible.';

        document.getElementById('poke-egg').innerText =
            data.egg_groups.map(e => tiposTraducidos[e.name] || e.name).join(', ');

        buscarEvoluciones(data.evolution_chain.url);
        buscarFormas(data.varieties);
    } catch (e) {
        console.error('Error descripción:', e);
    }
}

async function buscarCombate(tipos) {
    const efectividad = {};

    try {
        for (let tipoObj of tipos) {
            const res      = await fetch(tipoObj.type.url);
            const typeData = await res.json();
            const rel      = typeData.damage_relations;

            rel.double_damage_from.forEach(t => {
                efectividad[t.name] = (efectividad[t.name] || 1) * 2;
            });
            rel.half_damage_from.forEach(t => {
                efectividad[t.name] = (efectividad[t.name] || 1) * 0.5;
            });
            rel.no_damage_from.forEach(t => {
                efectividad[t.name] = 0;
            });
        }

        const debilidades  = [];
        const resistencias = [];

        for (const [tipo, mult] of Object.entries(efectividad)) {
            if (mult > 1) debilidades.push({ tipo, mult });
            if (mult < 1) resistencias.push({ tipo, mult });
        }

        debilidades.sort((a, b)  => b.mult - a.mult);
        resistencias.sort((a, b) => a.mult - b.mult);

        renderBadges('poke-weak',   debilidades);
        renderBadges('poke-resist', resistencias);

    } catch (e) {
        console.error('Error combate:', e);
    }
}

function renderBadges(elementId, lista) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<span class="no-data">Ninguna</span>';
        return;
    }

    lista.forEach(({ tipo, mult }) => {
        let multTexto;
        if      (mult === 0)    multTexto = '0×';
        else if (mult === 0.25) multTexto = '¼×';
        else if (mult === 0.5)  multTexto = '½×';
        else if (mult === 2)    multTexto = '2×';
        else if (mult === 4)    multTexto = '4×';
        else                    multTexto = mult + '×';

        const color = tipoColores[tipo] || '#888';
        const tiposTextoOscuro = ['electric', 'ice', 'normal', 'fairy', 'flying', 'grass', 'ground', 'steel'];
        const colorTexto = tiposTextoOscuro.includes(tipo) ? '#111' : '#fff';

        const badge = document.createElement('span');
        badge.className = 'type-badge';
        badge.style.background = color;
        badge.style.color      = colorTexto;
        badge.innerHTML = `${tiposTraducidos[tipo] || tipo} <em>${multTexto}</em>`;
        container.appendChild(badge);
    });
}

async function buscarEvoluciones(url) {
    try {
        const res     = await fetch(url);
        const evoData = await res.json();

        let evoChain = [];
        let nodo     = evoData.chain;

        do {
            const urlParts = nodo.species.url.split('/');
            const id       = urlParts[urlParts.length - 2];
            evoChain.push({ nombre: nodo.species.name, id });
            nodo = nodo.evolves_to[0];
        } while (nodo && nodo.hasOwnProperty('evolves_to'));

        const contenedor = document.querySelector('.evo-chain');
        contenedor.innerHTML = '';

        evoChain.forEach((poke, index) => {
            const div = document.createElement('div');
            div.className = 'evo-item';
            div.innerHTML = `
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png" alt="${poke.nombre}">
                <span>${poke.nombre}</span>
            `;
            contenedor.appendChild(div);

            if (index < evoChain.length - 1) {
                const flecha = document.createElement('span');
                flecha.className = 'arrow';
                flecha.innerText = '➔';
                contenedor.appendChild(flecha);
            }
        });

    } catch (e) {
        console.error('Error evoluciones:', e);
    }
}

async function buscarFormas(varieties) {
    const contenedorFormas = document.getElementById('formas-container');
    contenedorFormas.innerHTML = ''; 

    const formasAlt = varieties.filter(v => !v.is_default);

    if (formasAlt.length > 0) {
        for (let forma of formasAlt) {
            try {
                const res = await fetch(forma.pokemon.url);
                const formaData = await res.json();
                
                if (formaData.sprites.front_default) {
                    
                    let partesNombre = formaData.name.split('-');
                    partesNombre.shift(); 
                    let nombreLimpio = partesNombre.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                    
                    let div = document.createElement('div');
                    div.className = 'evo-item';
                    div.innerHTML = `
                        <img src="${formaData.sprites.front_default}" alt="${formaData.name}">
                        <span>${nombreLimpio}</span>
                    `;
                    contenedorFormas.appendChild(div);
                }
            } catch (error) {
                console.error("Error cargando forma", error);
            }
        }
    } else {
        contenedorFormas.innerHTML = '<p class="no-formas">Este Pokémon no tiene formas alternativas registradas.</p>';
    }
}