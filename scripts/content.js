let currentParcelData = null;
let currentIndex = 0;
let allParcels = [];

// Iniciar cargando datos del storage
chrome.storage.local.get(['parcelas', 'currentIndex'], (res) => {
    if (res.parcelas && res.parcelas.length > 0) {
        allParcels = res.parcelas;
        currentIndex = res.currentIndex || 0;
        currentParcelData = allParcels[currentIndex];
        injectHUD();
    }
});

function injectHUD() {
    const hud = document.createElement('div');
    hud.id = 'sigpac-hud';
    hud.innerHTML = `
        <div style="font-size: 12px; margin-bottom: 5px;">
            <b>Parcela Actual:</b> <span id="hud-info">M:${currentParcelData.municipio}|A:${currentParcelData.agregado}|Pol:${currentParcelData.poligono}|P:${currentParcelData.parcela}|R:${currentParcelData.recinto}</span>
        </div>
        <button id="btn-blue" class="hud-btn">🔵 NAVEGAR</button>
        <button id="btn-red" class="hud-btn">🔴 DESCARTAR</button>
        <button id="btn-green" class="hud-btn">🟢 VIGENTE / EDITAR</button>
        
        <div id="edit-form" style="display: none; margin-top: 10px; border-top: 1px solid #ccc; pt: 5px;">
            <label style="font-size:10px">Superficie (ha):</label>
            <input type="text" id="edit-superficie" style="width:100%; margin-bottom:5px" value="${currentParcelData.superficie}">
            
            <label style="font-size:10px">Cultivo:</label>
            <input type="text" id="edit-cultivo" style="width:100%; margin-bottom:5px" value="${currentParcelData.cultivo}">
            
            <label style="font-size:10px">Anotaciones:</label>
            <textarea id="note-input" style="width:100%; height: 50px;">${currentParcelData.anotaciones}</textarea>
            
            <button id="btn-save" style="margin-top:8px; width:100%; background: #27ae60; color: white; border: none; padding: 5px; cursor: pointer;">
                Guardar y Siguiente
            </button>
        </div>
    `;
    document.body.appendChild(hud);

    // Eventos de los botones
    document.getElementById('btn-blue').onclick = navigateToParcel;
    document.getElementById('btn-red').onclick = discardParcel;
    document.getElementById('btn-green').onclick = () => {
        document.getElementById('edit-form').style.display = 'block';
    };
    document.getElementById('btn-save').onclick = saveAndNext;
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
    updateParcel(true, ""); // Descartada = true
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
            window.location.reload();
        } else {
            alert("¡Procesamiento finalizado! Ya puedes descargar el CSV desde el panel de la extensión.");
            document.getElementById('sigpac-hud').innerHTML = "<b>✅ Fin del archivo</b>";
        }
    });
}