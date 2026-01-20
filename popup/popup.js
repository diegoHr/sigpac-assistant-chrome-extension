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
        const headers = lines[0].split(','); // Asumiendo separador por comas
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',');
            
            // Creamos el objeto de la parcela siguiendo tus requisitos
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
                descartada: cols[10] === 'true',
                procesada: cols[11] === 'true'
            };
            data.push(parcela);
        }

        // Guardar en el almacenamiento local de Chrome
        chrome.storage.local.set({ 
            'parcelas': data, 
            'currentIndex': 0 
        }, () => {
            updateUI(data, 0);
            downloadBtn.style.display = 'block';
            alert('CSV cargado y persistido correctamente.');
        });
    }

    // 3. Actualizar la UI del Popup
    function updateUI(data, index) {
        const total = data.length;
        const procesadas = data.filter(p => p.procesada).length;
        const actual = data[index];

        progressEl.innerText = `${procesadas} / ${total}`;
        if (actual) {
            currentParcelEl.innerText = `Pol: ${actual.poligono} - Par: ${actual.parcela}`;
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