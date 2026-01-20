document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csvFile');
    const btnLoadClick = document.getElementById('btnLoadClick');
    const goToSigpacBtn = document.getElementById('goToSigpac');
    const downloadBtn = document.getElementById('downloadCsv');
    const currentParcelEl = document.getElementById('currentParcel');
    const progressEl = document.getElementById('progress');

    btnLoadClick.addEventListener('click', () => {
        fileInput.click();
    });

    // 1. Redirección a SIGPAC
    goToSigpacBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://sigpac.mapa.gob.es/fega/visor/' });
    });

    // 2. Carga y Lectura del CSV
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target.result;
            processData(text);
        };
        reader.readAsText(file);
    });

    function processData(csvText) {
    const lines = csvText.split('\n');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        
        const procesada = cols[11]?.trim().toLowerCase() === 'true'; // Columna 11: Procesada

        const parcela = {
            provincia: cols[0],
            municipio: cols[1],
            agregado: cols[2],
            zona: cols[3],
            poligono: cols[4],
            parcela: cols[5],
            recinto: cols[6],
            superficie: cols[7],
            cultivo: cols[8],
            anotaciones: cols[9] || "",
            descartada: cols[10]?.trim().toLowerCase() === 'true',
            procesada: procesada
        };
        data.push(parcela);
    }

    // BUSCAR LA PRIMERA PARCELA NO PROCESADA
    const firstPendingIndex = data.findIndex(p => p.procesada === false);
    
    // Si todas están procesadas, empezamos por la última o la cero
    const startIndex = firstPendingIndex === -1 ? 0 : firstPendingIndex;

    chrome.storage.local.set({ 
        'parcelas': data, 
        'currentIndex': startIndex 
    }, () => {
        updateUI(data, startIndex);
        document.getElementById('downloadCsv').style.display = 'block';
        
        if (firstPendingIndex === -1 && data.length > 0) {
            alert('¡Atención! Todas las parcelas de este CSV ya aparecen como procesadas.');
        } else {
            alert(`CSV cargado. Reanudando desde la parcela ${startIndex + 1}.`);
        }
    });
}

    // 3. Actualizar la UI del Popup
    function updateUI(data, index) {
        const total = data.length;
        const procesadas = data.filter(p => p.procesada).length;
        const actual = data[index];

        progressEl.innerText = `${procesadas} / ${total}`;
        if (actual) {
            currentParcelEl.innerText = `M:${actual.municipio} - A: ${actual.agregado} - Pol: ${actual.poligono} - Par: ${actual.parcela} - R: ${actual.recinto}`;
        }
    }

    // Al abrir el popup, recuperar estado previo
    chrome.storage.local.get(['parcelas', 'currentIndex'], (result) => {
        if (result.parcelas) {
            updateUI(result.parcelas, result.currentIndex || 0);
            downloadBtn.style.display = 'block';
        }
    });

    // 4. Descargar CSV
    downloadBtn.addEventListener('click', () => {
        chrome.storage.local.get(['parcelas'], (result) => {
            if (!result.parcelas) return;
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Provincia,Municipio,Agregado,Zona,Polígono,Parcela,Recinto,Superficie,Cultivo,Anotaciones,Descartada,Procesada\n";
            
            result.parcelas.forEach(p => {
                const row = [p.provincia, p.municipio, p.agregado, p.zona, p.poligono, p.parcela, p.recinto, p.superficie, p.cultivo, p.anotaciones, p.descartada, p.procesada];
                csvContent += row.join(",") + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "sigpac_actualizado.csv");
            document.body.appendChild(link);
            link.click();
        });
    });
});