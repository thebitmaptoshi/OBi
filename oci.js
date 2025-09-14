// 0-907k : unvalidated, not a source of truth! there are still discrepancies in this data! always DYOR
/// bitmap on-chain index (OCI) module with post-840k addition (0-906,999.bitmap)

const pages = Array(10).fill(0); // Fix: 10 pages for 0-9

const allPages = [
    '/content/01bba6c58af39d7f199aa2bceeaaba1ba91b23d2663bc4ef079a4b5e442dbf74i0',
    '/content/bb01dfa977a5cd0ee6e900f1d1f896b5ec4b1e3c7b18f09c952f25af6591809fi0',
    '/content/bb02e94f3062facf6aa2e47eeed348d017fd31c97614170dddb58fc59da304efi0',
    '/content/bb037ec98e6700e8415f95d1f5ca1fe1ba23a3f0c5cb7284d877e9ac418d0d32i0',
    '/content/bb9438f4345f223c6f4f92adf6db12a82c45d1724019ecd7b6af4fcc3f5786cei0',
    '/content/bb0542d4606a9e7eb4f31051e91f7696040db06ca1383dff98505618c34d7df7i0',
    '/content/bb06a4dffba42b6b513ddee452b40a67688562be4a1345127e4d57269e6b2ab6i0',
    '/content/bb076934c1c22007b315dd1dc0f8c4a2f9d52f348320cfbadc7c0bd99eaa5e18i0',
    '/content/bb986a1208380ec7db8df55a01c88c73a581069a51b5a2eb2734b41ba10b65c2i0',
    '/content/b907b51a239e3a37f29f8222fb274f828c6ebf7b93ce501a55b7171daaa75758i0'
];

// ?origin= query param to set URL beginnings, like https://ordinals.com
const url = new URL(import.meta.url);
const params = new URLSearchParams(url.search);
let originParam = params.get('origin');

// for local testing;
originParam = 'https://ordinals.com'

let satIndicesPage9 = {};

async function fillPage(page) {
    if (page === 9) {
        let data = await fetch((originParam || '') + allPages[page]).then(r => r.json());
        satIndicesPage9 = data.satIndexMap;
        const fullSats = [];
        data.deltaEncodedSats.forEach((sat, i) => {
            if (i === 0) {
                fullSats.push(parseInt(sat));
            } else {
                fullSats.push(parseInt(fullSats[i-1]) + parseInt(sat));
            }
        });
        pages[page] = fullSats;
    } else {
        let data = await fetch((originParam || '') + allPages[page]).then(r => r.text());
        if (page === 2 || page === 3) {
            data = '[' + data + ']';
            data = JSON.parse(data);
            data = [data.slice(0, 99999), data.slice(100000, 199999)];
        } else {
            try {
                data = JSON.parse(data.replaceAll('\n  ', ''));
            } catch (e) {}
            try {
                data = JSON.parse(data.replaceAll('  ', ''));
            } catch (e) {}
        }
        const fullSats = [];
        data[0].forEach((sat, i) => {
            if (i === 0) {
                fullSats.push(parseInt(sat));
            } else {
                fullSats.push(parseInt(fullSats[i-1]) + parseInt(sat));
            }
        });
        let filledArray = Array(100000).fill(0);
        data[1].forEach((index, i) => {
            filledArray[index] = fullSats[i];
        });
        pages[page] = filledArray;
    }
}

export async function getBitmapSat(bitmapNumber) {
    if (bitmapNumber < 0) {
        console.error('getBitmapSat: number is below 0!');
    } else if (bitmapNumber > 907000) {
        console.error('getBitmapSat: number is above 906,999!');
    }
    let page;
    if (bitmapNumber >= 840000 && bitmapNumber < 907000) {
        page = 9;
    } else {
        page = Math.floor(bitmapNumber / 100000);
    }
    if (!pages[page]) {
        await fillPage(page);
    }
    if (bitmapNumber >= 840000) {
        return pages[page][bitmapNumber - 840000];
    } else {
        return pages[page][bitmapNumber % 100000];
    }
}

// satIndex: what index on the sat the bitmap inscription is
// some bitmaps are not the first inscription on their sat - data from @_lefrog
const satIndices = {92871: 1,92970: 1,123132: 1,365518: 1,700181: 1,826151: 1,827151: 1,828151: 1,828239: 1,828661: 1,829151: 1,830151: 1,832104: 2,832249: 2,832252: 2,832385: 4,833067: 1,833101: 3,833105: 4,833109: 4,833121: 8,834030: 2,834036: 2,834051: 17,834073: 4,836151: 1,837115: 2,837120: 2,837151: 1,837183: 3,837188: 2,838058: 5,838068: 2,838076: 2,838096: 1,838151: 1,838821: 1,839151: 1,839377: 1,839378: 2,839382: 2,839397: 1,840151: 1,841151: 1,842151: 1,845151: 1};

export function getBitmapSatIndex(bitmapNumber) {
    if (bitmapNumber >= 840000) {
        return satIndicesPage9[bitmapNumber] || 0;
    } else {
        return satIndices[bitmapNumber] || 0;
    }
}

export async function getBitmapSatIndexFull() {
    if (!pages[9]) {
        await fillPage(9);
    }
    return {
        ...satIndices,
        ...satIndicesPage9
    };
}

export async function getBitmapInscriptionId(bitmapNumber) {
    const sat = await getBitmapSat(bitmapNumber);
    const id = await fetch((originParam || '') + '/r/sat/' + sat + '/at/' + getBitmapSatIndex(bitmapNumber)).then(r => r.json());
    return id.id;
}

export async function getBitmapSatsRange(start, end) {
    const arr = [];
    const total = (end+1) - start;
    for (let i = start; i < (start + total); i++) {
        const sat = await getBitmapSat(i);
        arr.push(sat);
    }
    return arr;
}

// Returns { inscriptionId, isBitmap } for a given bitmap number (address)
export async function getBitmapInscriptionAndType(address) {
    const bitmapNumber = parseInt(address, 10);
    if (isNaN(bitmapNumber) || bitmapNumber < 0 || bitmapNumber > 906999) {
        return null;
    }
    const sat = await getBitmapSat(bitmapNumber);
    if (sat === undefined || sat === null) {
        return null;
    }
    const origin = (typeof originParam === 'string' && originParam.length > 0) ? originParam : 'https://ordinals.com';
    const atIndex = getBitmapSatIndex(bitmapNumber);
    const idResp0 = await fetch(origin + '/r/sat/' + sat + '/at/0').then(r => r.json());
    const idResp1 = await fetch(origin + '/r/sat/' + sat + '/at/-1').then(r => r.json());
    const inscriptionId0 = idResp0.id;
    const inscriptionId1 = idResp1.id;
    const isBitmap = (inscriptionId0 === inscriptionId1);
    return { inscriptionId: inscriptionId1, isBitmap };
}