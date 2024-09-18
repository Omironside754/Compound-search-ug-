const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
let PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const compoundMap = new Map();
const categoryMap = new Map();

function normalizeString(str) {
    return str ? str.replace(/\s+/g, ' ').trim().toLowerCase() : '';
}

function readExcelFile(filePath, isMainFile = false) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = isMainFile ? workbook.SheetNames[1] : workbook.SheetNames[0]; // Use the second sheet for the main file
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(worksheet, { header: 'A' });
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return null;
    }
}

function populateMaps() {
    const masterFilePath = path.join(__dirname, 'data', 'HRMS_classifiedData.xlsx');
    const masterData = readExcelFile(masterFilePath, true);

    if (masterData) {
        masterData.forEach(row => {
            const category = normalizeString(row.C);
            const formula = normalizeString(row.G);
            if (category && formula) {
                if (!categoryMap.has(category)) {
                    categoryMap.set(category, new Set());
                }
                categoryMap.get(category).add(formula);
            }
        });
    }

    const sampleFiles = [
        'SBW1_ALL_COMPOUNDS.xlsx', 'SBW2_ALL_COMPOUNDS.xlsx', 'SBW3_ALL_COMPOUNDS.xlsx',
        'SBW4_ALL_COMPOUNDS.xlsx', 'SBW5_ALL_COMPOUNDS.xlsx', 'SBW6_1_ALL_Compounds.xlsx',
        'SBW6_2_ALL_Compounds.xlsx', 'SD1_ALL_Compounds.xlsx', 'SD2_ALL_Compounds.xlsx',
        'SD3_ALL_COMPOUNDS.xlsx', 'SD4_ALL_COMPOUNDS.xlsx', 'SDW1_ALL_COMPOUNDS.xlsx',
        'SG1_ALL_COMPOUNDS.xlsx', 'SG2_ALL_COMPOUNDS.xlsx', 'SG3_ALL_COMPOUNDS.xlsx',
        'SG4_ALL_COMPOUNDS.xlsx', 'SG5_ALL_COMPOUNDS.xlsx', 'SP1_ALL_Compounds.xlsx',
        'SP2_ALL_Compounds.xlsx', 'SP3_ALL_COMPOUNDS.xlsx', 'SP4_ALL_COMPOUNDS.xlsx',
        'SP5_ALL_COMPOUNDS.xlsx', 'SS1_ALL_Compounds.xlsx', 'SS2_ALL_COMPOUNDS.xlsx',
        'SS3_ALL_COMPOUNDS.xlsx', 'SS4_ALL_COMPOUNDS.xlsx', 'ST1_ALL_Compounds.xlsx',
        'SV1_ALL_Compounds.xlsx', 'SV2_1_ALL_Compounds.xlsx', 'SV2_2_ALL_Compounds.xlsx',
        'SV3_1_ALL_Compounds.xlsx', 'SV3_2_ALL_Compounds.xlsx', 'SW1_ALL_Compounds.xlsx',
        'SW2_ALL_Compounds.xlsx', 'SW3_ALL_COMPOUNDS.xlsx', 'SW4_ALL_COMPOUNDS.xlsx',
        'SW5_ALL_COMPOUNDS.xlsx', 'SW6_ALL_COMPOUNDS.xlsx', 'SW7_ALL_COMPOUNDS.xlsx'
    ];

    sampleFiles.forEach(file => {
        const filePath = path.join(__dirname, 'data', 'Sample files', file);
        const compounds = readExcelFile(filePath);
        if (compounds) {
            compounds.forEach(compound => {
                if (compound && compound.C) {
                    const formula = normalizeString(compound.C);
                    if (formula) {
                        if (!compoundMap.has(formula)) {
                            compoundMap.set(formula, new Set());
                        }
                        compoundMap.get(formula).add(file);
                    }
                }
            });
        }
    });
}

app.get('/api/search', (req, res) => {
    const { query, type } = req.query;
    const normalizedQuery = normalizeString(query);

    if (type === 'compound') {
        const files = compoundMap.get(normalizedQuery) || new Set();
        res.json({ query: normalizedQuery, files: Array.from(files) });
    } else if (type === 'category') {
        const formulas = categoryMap.get(normalizedQuery) || new Set();
        const files = new Set();
        formulas.forEach(formula => {
            const formulaFiles = compoundMap.get(formula) || new Set();
            formulaFiles.forEach(file => files.add(file));
        });
        res.json({ query: normalizedQuery, files: Array.from(files) });
    } else {
        res.status(400).json({ error: 'Invalid search type' });
    }
});

populateMaps();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});