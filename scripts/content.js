let currentParcelData = null;
let currentIndex = 0;
let allParcels = [];

// Variables para el arrastre (Drag)
let isDragging = false;
let xOffset = 0;
let yOffset = 0;

function init() {
    chrome.storage.local.get(['parcelas', 'currentIndex'], (res) => {
        if (res.parcelas && res.parcelas.length > 0) {
            allParcels = res.parcelas;
            currentIndex = parseInt(res.currentIndex) || 0;
            createHUDContainer(); // Solo se crea una vez
            renderStep();        // Se actualizan los datos
        }
    });
}

// CREA EL CONTENEDOR (Solo una vez en la vida de la página)
function createHUDContainer() {
    if (document.getElementById('sigpac-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'sigpac-hud';
    hud.innerHTML = `
        <div class="hud-header" id="hud-drag-handle">Mover Panel ⠿</div>
        <div id="hud-content-area" class="hud-body"></div>
    `;
    document.body.appendChild(hud);

    // Activar arrastre
    const handle = document.getElementById('hud-drag-handle');
    handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        let startX = e.clientX - xOffset;
        let startY = e.clientY - yOffset;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            xOffset = e.clientX - startX;
            yOffset = e.clientY - startY;
            hud.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });
}



// Función principal de renderizado (se llama cada vez que avanzamos o retrocedemos)
function renderStep() {
    const contentArea = document.getElementById('hud-content-area');
    if (!contentArea) return;

    currentParcelData = allParcels[currentIndex];

    contentArea.innerHTML = `
        <div style="font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
            <b>📍 PARCELA [${currentIndex + 1} / ${allParcels.length}]</b><br>
            M: ${currentParcelData.municipio} | Ag: ${currentParcelData.agregado} | Pol: ${currentParcelData.poligono} | Par: ${currentParcelData.parcela} | R: ${currentParcelData.recinto}
        </div>
        
        <div id="display-info" style="font-size: 11px; margin-bottom: 10px; color: #555;">
            <b>Superficie:</b> ${currentParcelData.superficie} ha | <b>Cultivo:</b> ${currentParcelData.cultivo}
        </div>

        <button id="btn-blue" class="hud-btn">🔵 NAVEGAR</button>
        <button id="btn-red" class="hud-btn">🔴 DESCARTAR</button>
        <button id="btn-green" class="hud-btn">🟢 VIGENTE / EDITAR</button>
        
        <div id="edit-form" style="display: none; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
            <label style="font-size:10px">Superficie (ha):</label>
            <input type="text" id="edit-superficie" style="width:100%; margin-bottom:5px" value="${currentParcelData.superficie}">
            <label style="font-size:10px">Cultivo:</label>
            <input type="text" id="edit-cultivo" style="width:100%; margin-bottom:5px" value="${currentParcelData.cultivo}">
            <label style="font-size:10px">Anotaciones:</label>
            <textarea id="note-input" style="width:100%; height: 40px;">${currentParcelData.anotaciones}</textarea>
            <button id="btn-save" style="margin-top:8px; width:100%; background: #27ae60; color: white; border: none; padding: 5px; cursor: pointer;">Guardar y Siguiente</button>
        </div>

        <button id="btn-back" class="hud-btn btn-back" style="display: ${currentIndex > 0 ? 'block' : 'none'}">⬅️ ANTERIOR</button>
    `;

    // Reasignar eventos después de reescribir el innerHTML
    attachEvents();
}

function attachEvents() {
    document.getElementById('btn-blue').onclick = navigateToParcel;
    document.getElementById('btn-red').onclick  = discardParcel;
    document.getElementById('btn-green').onclick = () => {
        const form = document.getElementById('edit-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('btn-save').onclick  = saveAndNext;
    
    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.onclick = goBack;
}


function goBack() {
    if (currentIndex > 0) {
        currentIndex--;
        // Opcional: resetear estado de la que volvemos a visitar
        allParcels[currentIndex].procesada = false;
        
        chrome.storage.local.set({ 'parcelas': allParcels, 'currentIndex': currentIndex }, () => {
            renderStep(); // RE-RENDERIZADO INSTANTÁNEO
        });
    }
}





// Lógica para navegar vía JavaScript en SIGPAC
function navigateToParcel() {
    console.log("Navegando a:", currentParcelData);
    const inputProvincia = document.getElementById('dirProv');
    inputProvincia.value = currentParcelData.provincia
    const inputMunicipio = document.getElementById('dirMun');
    inputMunicipio.value = currentParcelData.municipio
    const inputAgregado = document.getElementById('dirAgr');
    inputAgregado.value = currentParcelData.agregado
    const inputZona = document.getElementById('dirZona');
    inputZona.value = currentParcelData.zona
    const inputPoligono = document.getElementById('dirPol');
    inputPoligono.value = currentParcelData.poligono
    const inputParcela = document.getElementById('dirPar');
    inputParcela.value = currentParcelData.parcela
    const inputRecinto = document.getElementById('dirRec');
    inputRecinto.value = currentParcelData.recinto
    document.getElementById('wc-buscador-sigpac-boton-buscar').click()
    // Nota: SIGPAC usa formularios internos. Lo ideal es inyectar valores en sus inputs de búsqueda.
    // Ejemplo genérico (los IDs reales dependen de la versión de la web):
    // document.getElementById('txtProvincia').value = currentParcelData.provincia;
    // document.getElementById('btnBuscar').click();
}

function discardParcel() {
    updateParcel(true, "Descartada", currentParcelData.superficie, currentParcelData.cultivo); // Descartada = true
}

function saveAndNext() {
    // Capturamos los valores editados
    const updatedNote = document.getElementById('note-input').value;
    const updatedSuperficie = document.getElementById('edit-superficie').value;
    const updatedCultivo = document.getElementById('edit-cultivo').value;

    updateParcel(false, updatedNote, updatedSuperficie, updatedCultivo);
}

function updateParcel(isDiscarded, note, superficie, cultivo) {
    allParcels[currentIndex].procesada = true;
    allParcels[currentIndex].descartada = isDiscarded;
    allParcels[currentIndex].anotaciones = note;
    allParcels[currentIndex].superficie = superficie; // Actualizamos superficie
    allParcels[currentIndex].cultivo = cultivo;       // Actualizamos cultivo

    currentIndex++;
    
    chrome.storage.local.set({ 
        'parcelas': allParcels, 
        'currentIndex': currentIndex 
    }, () => {
        if (currentIndex < allParcels.length) {
            // Recargamos para pasar a la siguiente
            renderStep()
            //window.location.reload();
        } else {
            alert("¡Procesamiento finalizado! Ya puedes descargar el CSV desde el panel de la extensión.");
            document.getElementById('sigpac-hud').innerHTML = "<b>✅ Fin del archivo</b>";
        }
    });
}

init();