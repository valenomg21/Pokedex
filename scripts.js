// Función para cambiar las pestañas usando el D-pad
function changeTab(tabId) {
    // 1. Ocultar todos los contenidos de las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 2. Mostrar la pestaña solicitada
    const activeTab = document.getElementById('tab-' + tabId);
    activeTab.classList.add('active');

    // 3. Cambiar el título en la pantalla derecha
    const title = document.getElementById('tab-title');
    title.innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

const tiposTraducidos = {
    normal: 'Normal', fighting: 'Lucha', flying: 'Volador',
    poison: 'Veneno', ground: 'Tierra', rock: 'Roca',
    bug: 'Bicho', ghost: 'Fantasma', steel: 'Acero',
    fire: 'Fuego', water: 'Agua', grass: 'Planta',
    electric: 'Eléctrico', psychic: 'Psíquico', ice: 'Hielo',
    dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada'
};

const inputSearch = document.getElementById('poke-input');

inputSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        let pokemonQuery = inputSearch.value.toLowerCase().trim();
        
        if (pokemonQuery !== "") {
            buscarPokemon(pokemonQuery);
        }
    }
});

async function buscarPokemon(query) {
    try {
        console.log("Buscando a: ", query);
        
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
        if (!response.ok) {
            throw new Error("Pokémon no encontrado");
        }

        const data = await response.json();
        console.log(data);

        actualizarPokedex(data)

    } catch (error) {
        console.error("Error al buscar el Pokémon", error);
        document.getElementById('poke-name').innerText = "No encontrado";
    }
    
}

function actualizarPokedex(data) {
    let nombre = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    document.getElementById('poke-name').innerText = nombre;

    document.getElementById('poke-image').src = data.sprites.front_default;

    document.getElementById('poke-id').innerText = "#" + data.id.toString().padStart(3, '0');

    document.getElementById('poke-weight').innerText = (data.weight / 10) + " kg";
    document.getElementById('poke-height').innerText = (data.height / 10) + " m";

    let tiposText = data.types.map(t => t.type.name).join(', ');
    document.getElementById('poke-types').innerText = tiposText;

    document.getElementById('stat-hp').style.width = (data.stats[0].base_stat / 1.5) + "%";
    document.getElementById('stat-atk').style.width = (data.stats[1].base_stat / 1.5) + "%"; 
    document.getElementById('stat-def').style.width = (data.stats[2].base_stat / 1.5) + "%";
    document.getElementById('stat-spd').style.width = (data.stats[5].base_stat / 1.5) + "%";

    buscarDescription(data.id);

    if (data.moves.length > 0) {
        let randomMove = data.moves[Math.floor(Math.random() * data.moves.length)].move.name;
        document.getElementById('poke-move').innerText = randomMove.charAt(0).toUpperCase() + randomMove.slice(1);
    } else {
        document.getElementById('poke-move').innerText = "No tiene movimientos";
    }

    buscarCombate(data.types);
}

async function buscarDescription(id) {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon-species/' + id);
        const speciesData = await response.json();

        const textEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');

        if (textEntry) {
            let descripcionLimpia = textEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
            document.getElementById('poke-desc').innerText = descripcionLimpia
    } else {
        document.getElementById('poke-desc').innerText = "Descripción no disponible";
    }

    let eggGroups = speciesData.egg_groups.map(egg => egg.name).join(', ');
    document.getElementById('poke-egg').innerText = eggGroups;

    buscarEvoluciones(speciesData.evolution_chain.url);
    } catch (error) {
        console.error("Error al buscar la descripción", error);
    }
}

async function buscarCombate(tipos) {
    let debilidades = new Set();
    let resistencias = new Set();

    try {
        // Consultamos la URL de cada tipo que tiene el Pokémon
        for (let tipo of tipos) {
            const response = await fetch(tipo.type.url);
            const typeData = await response.json();
            
            // Añadimos quienes le hacen el doble de daño (Debilidades)
            typeData.damage_relations.double_damage_from.forEach(t => debilidades.add(tiposTraducidos[t.name] || t.name));
            
            // Añadimos quienes le hacen la mitad de daño o cero daño (Resistencias/Inmunidades)
            typeData.damage_relations.half_damage_from.forEach(t => resistencias.add(tiposTraducidos[t.name] || t.name));
            typeData.damage_relations.no_damage_from.forEach(t => resistencias.add(tiposTraducidos[t.name] || t.name));
        }
        
        // Lo mostramos en pantalla uniéndolos con comas
        document.getElementById('poke-weak').innerText = Array.from(debilidades).join(', ') || 'Ninguna';
        document.getElementById('poke-resist').innerText = Array.from(resistencias).join(', ') || 'Ninguna';

    } catch (error) {
        console.error("Error al cargar datos de combate", error);
    }
}


// --- FUNCION PARA EVOLUCIONES ---
async function buscarEvoluciones(url_evolucion) {
    try {
        const response = await fetch(url_evolucion);
        const evoData = await response.json();
        
        let evoChain =[];
        let evoDataCurrent = evoData.chain;

        // Recorremos el árbol de evoluciones
        do {
            let nombreEvo = evoDataCurrent.species.name;
            
            // Extraemos el ID de la URL para poder buscar su imagen
            let urlParts = evoDataCurrent.species.url.split('/');
            let id = urlParts[urlParts.length - 2];
            
            evoChain.push({ nombre: nombreEvo, id: id });

            evoDataCurrent = evoDataCurrent.evolves_to[0]; // Avanzamos a la siguiente evolución
        } while (evoDataCurrent && evoDataCurrent.hasOwnProperty('evolves_to'));

        // Dibujamos las tarjetas de evolución en el HTML
        const contenedorEvo = document.querySelector('.evo-chain');
        contenedorEvo.innerHTML = ''; // Limpiamos lo anterior

        evoChain.forEach((poke, index) => {
            let div = document.createElement('div');
            div.className = 'evo-item';
            div.innerHTML = `
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png" alt="${poke.nombre}">
                <span>${poke.nombre}</span>
            `;
            contenedorEvo.appendChild(div);

            // Agregamos la flecha si no es la última evolución
            if (index < evoChain.length - 1) {
                let flecha = document.createElement('span');
                flecha.className = 'arrow';
                flecha.innerText = '➔';
                contenedorEvo.appendChild(flecha);
            }
        });

    } catch (error) {
        console.error("Error al buscar evoluciones", error);
    }
}