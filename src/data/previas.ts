// Datos extraídos del sitio original de la EEST N°1 Monte Grande.
export type DocItem = { type: "file"; id: string; name: string; label: string };
export type TextItem = { type: "text"; text: string; href?: string };
export type Item = DocItem | TextItem;
export type Section = { title: string; items: Item[] };

export const previasSections: Section[] = [
  {
    "title": "Fechas de previas de Agosto 2026",
    "items": [
      {
        "type": "file",
        "id": "1xEcvlpeJ0A-fxzywVmAxAz9O7vPWy_1u",
        "name": "PREVIAS AGOSTO 2026.xlsx",
        "label": "PREVIAS AGOSTO 2026.xlsx"
      }
    ]
  },
  {
    "title": "Fechas ,horarios y profesores designados",
    "items": []
  },
  {
    "title": "Formulario de inscripción Agosto 2026",
    "items": [
      {
        "type": "text",
        "text": "Ingresá al siguiente link y accedé al formulario de inscripción para materias pendientes de acreditació n completa carrera https://forms.gle/euECqFMK7wDeovMq6",
        "href": "https://forms.gle/euECqFMK7wDeovMq6"
      }
    ]
  },
  {
    "title": "Guía para intensificación",
    "items": [
      {
        "type": "file",
        "id": "12bLZWLAoS7YeOfCNIrt4ZdVH2tQ9A0lS",
        "name": "Basico-Materias pendientes de aprobación y acreditación.pdf",
        "label": "Ciclo Básico"
      },
      {
        "type": "file",
        "id": "139LzVC2byU3oTcM-d3si9mHk9fvic5Y3",
        "name": "Informatica-Materias pendientes de aprobación y acreditación.pdf",
        "label": "Tecnicatura en Informática"
      },
      {
        "type": "file",
        "id": "1n1C5yOUf4R1xO63eG1sPOwXg-Pi04nU3",
        "name": "Programacion Materias pendientes de aprobación y acreditación.pdf",
        "label": "Tecnicatura en Programación"
      }
    ]
  },
  {
    "title": "PREVIAS FEBRERO 2025",
    "items": [
      {
        "type": "file",
        "id": "188kSumTF85psjKIZWJQq8qemwRKfNh1K",
        "name": "PREVIAS febrero 2025.xlsx",
        "label": "PREVIAS febrero 2025.xlsx"
      }
    ]
  },
  {
    "title": "Fechas ,horarios y profesores designados para rendir materias previas.",
    "items": []
  },
  {
    "title": "EQUIVALENCIAS DE TALLER",
    "items": [
      {
        "type": "file",
        "id": "1N57pNMrmJRki2lYmGupVethiWS2a-YMc",
        "name": "EQUIVALENCIAS DE TALLER 1.pdf",
        "label": "Equivalencias de taller 1"
      },
      {
        "type": "file",
        "id": "1ioZSph5mWHC-rw4Qp4b0iI8JUHwh3rvh",
        "name": "EQUIVALENCIAS DE TALLER 2.pdf",
        "label": "Equivalencias de taller 2"
      },
      {
        "type": "file",
        "id": "1PyV_SfBnZNrdE_bjTmFMJHTVnr3UppBf",
        "name": "EQUIVALENCIAS DE TALLER 3.pdf",
        "label": "Equivalencias de taller 3"
      }
    ]
  },
  {
    "title": "CICLO BÁSICO-TALLERES",
    "items": [
      {
        "type": "file",
        "id": "1mVekAQJZHuTna0vkux3XGu_IXyYW2Ew6",
        "name": "1º año- LENGUAJES TECNOLOGICOS (PREVIAS) - 2024.pdf",
        "label": "Lenguajes Tecnológicos 1° año"
      },
      {
        "type": "file",
        "id": "1kSqCcDG-g3HOXjv8Xr6ghemCcEC7061q",
        "name": "1º año- PROCEDIMIENTOS TECNICOS (PREVIAS) - 2024.pdf",
        "label": "Procedimientos Técnicos 1° año"
      },
      {
        "type": "file",
        "id": "1A2DYXBrVBM8_OGCyxMEcY4rgpZqJhHSu",
        "name": "1º año- SISTEMAS TECNOLOGICOS  (PREVIAS) - 2024.pdf",
        "label": "Sistemas Tecnológicos 1°año"
      },
      {
        "type": "file",
        "id": "1OHHuIjWfw9lOmJ_rS2faBhpCDENL9Vya",
        "name": "2º año- LENGUAJES TECNOLOGICOS (PREVIAS) - 2024.pdf",
        "label": "Lenguajes Tecnológicos 2° año"
      },
      {
        "type": "file",
        "id": "1ewwozaeUZ6nnhrQI_A9TnaqCmhs7aalN",
        "name": "2º año- PROCEDIMIENTOS TECNICOS (PREVIAS) - 2024.pdf.pdf",
        "label": "Procedimientos Técnico 2° año"
      },
      {
        "type": "file",
        "id": "15j8D4TnF8I6WAfytJlspK0seQJSl8C-_",
        "name": "2º año- SISTEMAS TECNOLOGICOS (PREVIAS) - 2024.pdf",
        "label": "Sistemas Tecnológicos 2° año"
      },
      {
        "type": "file",
        "id": "1dGWW8BFakGwO1L0TzIfiqeWVlrmMFR3U",
        "name": "3º año- LENGUAJES TECNOLOGICOS (PREVIAS) - 2024.pdf",
        "label": "Lenguajes Tecnológicos 3° año"
      },
      {
        "type": "file",
        "id": "1pxyv8qdUd1oD8XIL3KpVwzHXB9zreojt",
        "name": "3º año- PROCEDIMIENTOS TECNICOS (PREVIAS) - 2024.pdf",
        "label": "Procedimientos Técnicos 3° año"
      },
      {
        "type": "file",
        "id": "1FM88nW7ctahwdHWV9rraLwQe9ssEh6HD",
        "name": "3º año -SISTEMAS TECNOLOGICOS (PREVIAS) - 2024.pdf",
        "label": "Sistemas Tecnológicos 3° año"
      }
    ]
  },
  {
    "title": "Primer Año",
    "items": [
      {
        "type": "file",
        "id": "1WKTlgw3Pc-NRt6qR52SLzJ-UptzSpZZN",
        "name": "TRABAJO INTENSIFICACION1° CS NAT . 2025.docx",
        "label": "TRABAJO INTENSIFICACION1° CS NAT . 2025.docx"
      },
      {
        "type": "file",
        "id": "1hV_KG26QO2duF1ZowyUPbH1y58WF4w9N",
        "name": "DOC-20210623-WA0096. (1).pdf",
        "label": "Ciencias Sociales"
      },
      {
        "type": "file",
        "id": "1l1irb5vdpNgcx0aYeLmKkBFDVr5SDrw_",
        "name": "Musica 1° año.pdf",
        "label": "Música"
      },
      {
        "type": "file",
        "id": "1h7L0vGeAfc6pUJyMOg0WFKKliZT80ssH",
        "name": "PREVIOS 1°.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "10Tj9mHSXFgd4rqCx5hRbo7OiPgCSIBuQ",
        "name": "1st Year English Final Test Previos.pdf",
        "label": "Ingles"
      },
      {
        "type": "file",
        "id": "1q6opIccre5RK3QaFJ_ToRX1-0Tmj-06q",
        "name": "Trabajo de intensificacion  de 1er año 2025 .pdf",
        "label": "Matemática"
      },
      {
        "type": "file",
        "id": "1HjAWBJSSu_D-zMLyAs1GCZ929M4AE2Cw",
        "name": "2023 TP INTEGRADOR - PDL 1° AÑO.pdf",
        "label": "Prácticas del Lenguaje"
      },
      {
        "type": "file",
        "id": "1fW6v5b85xP3m_G6DIxrTL8H8iKvrBL_N",
        "name": "intensificación 1er año ciudadanía.docx.pdf",
        "label": "Construcción Ciudadana"
      }
    ]
  },
  {
    "title": "Segundo Año",
    "items": [
      {
        "type": "file",
        "id": "15xT_nA4H9GnVYwhxd8M4VxrSOEatwDbj",
        "name": "Tp integrador Biología 2do.docx",
        "label": "Tp integrador Biología 2do.docx"
      },
      {
        "type": "file",
        "id": "1PlpJEvsZmeTSrkVwBg5tqVt7x3-XyPyJ",
        "name": "CIUDADANÍA INTENSIFICACIÓN 2°.docx.pdf",
        "label": "Construcción de Ciudadanía"
      },
      {
        "type": "file",
        "id": "1FM0kXsgERCR_o56sAW9EnD5j1gg3GFfx",
        "name": "2DO  PLASTICA.pdf",
        "label": "Ed.Art. Plástica"
      },
      {
        "type": "file",
        "id": "19vGTx6jKFfrSK0cZtVIA2lfVj0zhLVrw",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO BÁSICO 2° AÑO.docx",
        "label": "Educación Fisíca"
      },
      {
        "type": "file",
        "id": "1PKUfNcGCXoSQTK3XjoqfzpX7l45A99n4",
        "name": "Fisicoquímica 2° año.pdf",
        "label": "FisicoQuimica"
      },
      {
        "type": "file",
        "id": "1314oFVrudj5WNwFKjGk7WN5kvArthVaE",
        "name": "Guía de Geografía 2 año - PREVIOS.docx",
        "label": "Geografía"
      },
      {
        "type": "file",
        "id": "1DIsUJ1J_nDTjeM53Zr_xVxeUqnphEDlA",
        "name": "TRABAJO INTEGRADOR DE CONTENIDOS PRIORITARIOS DE HISTORIA 2º2 y 2°3° tec1 2020.pdf",
        "label": "Historia"
      },
      {
        "type": "file",
        "id": "1SIwPIXKGzgn77kMcgb0T6cUZN0RJUr18",
        "name": "2do Mesa Diciembre 2019 Regulares.pdf",
        "label": "Ingles"
      },
      {
        "type": "file",
        "id": "11WVsHVNHhJnGBBopx4tQPexVB6yxl0fx",
        "name": "Trabajo de Intensificación para segundo año   EEST.pdf",
        "label": "Matemática"
      },
      {
        "type": "file",
        "id": "168Pc402ofOK7_G0UO6xiwr72GhQ4R3fp",
        "name": "Trabajo integrador PDL 2do EESyT N°1.docx",
        "label": "P.D.L"
      }
    ]
  },
  {
    "title": "Tercer Año",
    "items": [
      {
        "type": "file",
        "id": "1WKTlgw3Pc-NRt6qR52SLzJ-UptzSpZZN",
        "name": "TRABAJO INTENSIFICACION1° CS NAT . 2025.docx",
        "label": "Ciencias Naturales"
      },
      {
        "type": "file",
        "id": "1aA8akBaGP33ywxEf1rmnHutZej_l1rpc",
        "name": "intensificación ciudadanía 3.docx.pdf",
        "label": "Construcción de la Ciudadanía"
      },
      {
        "type": "file",
        "id": "1W_2p5yfg7uqQLqK69vQG_g4dstLXu0Bf",
        "name": "3° AÑO PLASTICA.pdf",
        "label": "Ed.Art. Plástica"
      },
      {
        "type": "file",
        "id": "1IZZ-i2hmPLp1egUA1SeN4Jgivffucfel",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO BÁSICO 3°AÑO.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1gM5QmpxICdhZ9_nWEzg2dvUv0VoZELdi",
        "name": "Guía de Geografía 3 año - PREVIOS.docx",
        "label": "Geografía"
      },
      {
        "type": "file",
        "id": "1IjvFjmx2pjKtmR8-nwI-o4GD8kDm7cw9",
        "name": "TP integrador para aprobar  3º.pdf",
        "label": "Fisico Quimica"
      },
      {
        "type": "file",
        "id": "1LKzZwRcL9_W2wh6a8MQTquuWCwxy8SDM",
        "name": "TPI HISTORIA 3°.docx",
        "label": "Historia"
      },
      {
        "type": "file",
        "id": "10GUt9y5lzlQtNQsStSIkBZ7UwvKvjaDT",
        "name": "3er Año de Inglés Previos.pdf",
        "label": "Inglés"
      },
      {
        "type": "file",
        "id": "1W9zfOjyg8gg0VIHCwO-BkvoDFAvaurK_",
        "name": "TP DE INTENSIFICACIÓN DE 3° AÑO.pdf",
        "label": "Matemática"
      },
      {
        "type": "file",
        "id": "1QbtgJ6dxpANAppvUDrft4qnuXv40wL4W",
        "name": "PDL 3ro.pdf",
        "label": "P.D.L"
      }
    ]
  },
  {
    "title": "Cuarto Año",
    "items": [
      {
        "type": "file",
        "id": "1JuGkWMUVpNLDHtTygopHi52rCLndeGcR",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO SUPERIOR 4°AÑO.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1PT9lGjeEuqa7joeOYdPPSkmEBkHa-JZi",
        "name": "TRABAJO FÍSICA 4°.pdf",
        "label": "Fisica"
      },
      {
        "type": "file",
        "id": "1qREIXB3N0J_z7p1ashzQgBuT5T_P-Smr",
        "name": "Geografia 4° año.docx",
        "label": "Geografía"
      },
      {
        "type": "file",
        "id": "1bwp65aPGiErMDyZTsSPbC7C17GAp2ZiB",
        "name": "Historia 4°.docx",
        "label": "Historia"
      },
      {
        "type": "file",
        "id": "191PMA0F3bWmRJvsYWD6gGHm7V5xUuZkC",
        "name": "4th Year- TP integrador.pdf",
        "label": "inglés"
      },
      {
        "type": "file",
        "id": "1jG35xXHeHQZD2pEj_9LPA4mHaSz9eCnZ",
        "name": "continuidad pedagógica PDL4to.docx",
        "label": "Literatura"
      },
      {
        "type": "file",
        "id": "1CXuWpzxGIV6vr7aUSWHrrJ0aquvWFnMo",
        "name": "intensificacion 4to año matemática.pdf",
        "label": "Matematica"
      },
      {
        "type": "file",
        "id": "1mBr01lqfMW4xZTQhqZD9rMM_og0Evxei",
        "name": "PDF_13Nov25_0152_merged.pdf",
        "label": "Quimica -Previos"
      },
      {
        "type": "file",
        "id": "1eRX78AUHjWmCLmIdYqdydUT02pEeq7Ax",
        "name": "TRABAJO SALUD Y ADOLESCENCIA 4°.pdf",
        "label": "Salud y Adolescencia"
      },
      {
        "type": "file",
        "id": "1CTa1siE-bmnIPPqaNyoew9dGYunAMn7o",
        "name": "INTENSIFICA 4to 2025 - Laboratorio de Hardware - Trabajo Integrador.pdf",
        "label": "Laboratorio de Hardware"
      },
      {
        "type": "file",
        "id": "1ldPBxN-aPqoFqQDb5B3FGggONOCOBR3Y",
        "name": "INTENSIFICA 4to 2025 - Laboratorio de Sistemas Operativos - Trabajo Integrador.pdf",
        "label": "Laboratorio de Sistemas Operativos"
      },
      {
        "type": "file",
        "id": "1Je7poDVOwNmTx1kfnhxOtT6FQ53sEVui",
        "name": "lab de programacion I informatica 4°.pdf",
        "label": "Laboratorio de Programacion"
      },
      {
        "type": "file",
        "id": "1Htcbn7FhLocTIT7MoE0KwiQ8rTviA2gb",
        "name": "Tecn_Electr_Informática.pdf",
        "label": "Tecnologías Electrónicas"
      },
      {
        "type": "file",
        "id": "1ndyGE2kNwHNj2clO33v9gdNwsETCGPXA",
        "name": "T_integrador_Lab_Aplic._4to.pdf",
        "label": "Laboratorio de Aplicaciones"
      }
    ]
  },
  {
    "title": "Quinto Año - Informática",
    "items": [
      {
        "type": "file",
        "id": "1gnn_YJ_kSD7FAaQv0mQnUmhOJyxvICo3",
        "name": "5to LIT TP integrador.pdf",
        "label": "Literatura"
      },
      {
        "type": "file",
        "id": "1OD4UizY5_j8__PcSp5wRU2ixA8zczPh8",
        "name": "Ingles 5° año.pdf",
        "label": "Inglés"
      },
      {
        "type": "file",
        "id": "1-59KPJWZliIn97KkIjOyKsnr-AbsRffk",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO SUPERIOR 5°AÑO.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1-EZ6LICW5yCaxv22F4G8u6Du3PFT2dTw",
        "name": "Integrador ciudadanía 1ro1ra.docx",
        "label": "Política y Ciudadanía"
      },
      {
        "type": "file",
        "id": "1x_x3k3PPcvCNoKIZ_5DxfMPdGbHKxbJi",
        "name": "Geografia 5°año.docx",
        "label": "Geografía"
      },
      {
        "type": "file",
        "id": "1A-JZNLIid89USNNXcFgqc7NxzCkXCR56",
        "name": "intensificacion analisis matematico2025.pdf",
        "label": "Análisis Matemático"
      },
      {
        "type": "file",
        "id": "1BzrN20nAyvZ845iBIKa6e9eqKQuOLakQ",
        "name": "SistemasDigitales5to.doc",
        "label": "Sistemas Digitales"
      },
      {
        "type": "file",
        "id": "13uf9jLWn3V89kmQi304eQDdR3D2Ha5md",
        "name": "Trabajo de investigación - Teleinformática 5to - Correia.PDF",
        "label": "Teleinformática"
      },
      {
        "type": "file",
        "id": "1BrJZi06HMEhtynLnCEmvDfiKkgHooW1y",
        "name": "Trabajo integrador programación 5°año - informática.pdf",
        "label": "Laboratorio de Programación"
      },
      {
        "type": "file",
        "id": "1sxvOk2laOWUoGe9LCJToRGK7jOOIGPzQ",
        "name": "TP_lab. de hardware II informatica.pdf",
        "label": "Laboratorio de Hardware II"
      },
      {
        "type": "file",
        "id": "1m9-JGgxpDEUqqd6CXy-CZNY3gx-rkXpN",
        "name": "T_integrador_Lab.SistOp_5toInf.pdf",
        "label": "Laboratorio de Sistemas Operativos"
      },
      {
        "type": "file",
        "id": "1PBW04gUCOth7YkqrbnQl4ckp6Wspnfrr",
        "name": "Trabajo Evaluador - Laboratorio de Aplicacion 5° año Prof Juan Jose Domato (1).pdf",
        "label": "Laboratorio de Aplicaciones"
      }
    ]
  },
  {
    "title": "Quinto Año - Programación",
    "items": [
      {
        "type": "file",
        "id": "1IaPsaJKh9lNoOo_MgnA34zsiZClheTia",
        "name": "TP Integrador 5.1 - Prof. Preli.pdf",
        "label": "Literatura"
      },
      {
        "type": "file",
        "id": "1OD4UizY5_j8__PcSp5wRU2ixA8zczPh8",
        "name": "Ingles 5° año.pdf",
        "label": "Ingles"
      },
      {
        "type": "file",
        "id": "1Tt4UMX5dRCpHCuKa3xLF4n6MI2iTpbAb",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO SUPERIOR 5°AÑO.docx.pdf",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1-EZ6LICW5yCaxv22F4G8u6Du3PFT2dTw",
        "name": "Integrador ciudadanía 1ro1ra.docx",
        "label": "Política y Ciudadanía"
      },
      {
        "type": "file",
        "id": "1pTbZWO81w2VNxTGkwUHw9LaIRy1QlnvW",
        "name": "Geografia 5°año.docx",
        "label": "Geografía"
      },
      {
        "type": "file",
        "id": "1A-JZNLIid89USNNXcFgqc7NxzCkXCR56",
        "name": "intensificacion analisis matematico2025.pdf",
        "label": "Análisis Matemático"
      },
      {
        "type": "file",
        "id": "1BzrN20nAyvZ845iBIKa6e9eqKQuOLakQ",
        "name": "SistemasDigitales5to.doc",
        "label": "Sistemas Digitales"
      },
      {
        "type": "file",
        "id": "1SRP7tBFq4-11EmiQDZGpd3nYSKKBf1-V",
        "name": "Modelos y Sistemas.docx",
        "label": "Modelos y Sistemas"
      },
      {
        "type": "file",
        "id": "1ZpaIs3eWb8hFV0FpovFKy2Nv1QsgF1p4",
        "name": "PROGRAMACION_5_COMPLETA_CARRERA_MODALIDAD_PROGRAMACION.pdf",
        "label": "Laboratorio de Programación"
      },
      {
        "type": "file",
        "id": "1hAK_cHEt9UVc5jTTepxHBGdyEdb9Na2c",
        "name": "Previa de Laboratorio de Diseño Web.docx",
        "label": "Laboratorio de Diseño Web"
      },
      {
        "type": "file",
        "id": "15l3wcXTWctfTae3IHssRiraG9ywi7C1H",
        "name": "Trabajo integrador laboratorio de redes 5to años.docx",
        "label": "Lab.de Redes Informáticas"
      },
      {
        "type": "file",
        "id": "1Xt3Os1YqtB84XUaHtraGUu5Za_tv3uL_",
        "name": "Previo Lab de diseño de base de datos 5to.pdf",
        "label": "Lab.de Diseño Base de Datos"
      }
    ]
  },
  {
    "title": "Sexto año-Informática",
    "items": [
      {
        "type": "file",
        "id": "1HPF070t-3gQ26yeBFfMj5zPTsOgwxTGX",
        "name": "6t0 TP Integrador.pdf",
        "label": "Literatura"
      },
      {
        "type": "file",
        "id": "1JtluxwoqhPmunR2wdvEQYKyN9vK1wKO0",
        "name": "6° año Tecnica..pdf",
        "label": "Ingles"
      },
      {
        "type": "file",
        "id": "1n90E3k6kSBCEdhbJyhR6_dCsoV36tDxt",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO SUPERIOR 6°AÑO.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1iChGZNm8ePZJgidAvoKgjGqu9dXzRrAH",
        "name": "INTENSIFICA 6to 2025 - Laboratorio de Sistemas Operativos- Trabajo Integrador.pdf",
        "label": "Laboratorio de Sistemas Operativos"
      },
      {
        "type": "file",
        "id": "1qM1FJHIAnR8br180px-3J8bNi0qHMcvx",
        "name": "INTENSIFICA 6to 2025 - Laboratorio de Hardware - Trabajo Integrador.pdf",
        "label": "Laboratorio de Hardware"
      },
      {
        "type": "file",
        "id": "1eL8xLTRy1y_sDliKu35PiY95o1sCsZOc",
        "name": "Intensificación 1er cuatrimestre 6to 1ra Turno Mañana.pdf",
        "label": "Matemática Aplicada( 1° cuatrimestre)"
      },
      {
        "type": "file",
        "id": "1O6EdV-0HD2yOQx0NezwFn6ttvSW08Uht",
        "name": "Intensificación 2do cuatrimestre 6to 1ra Turno Mañana.pdf",
        "label": "Matemática Aplicada(2° cuatrimestre)"
      },
      {
        "type": "file",
        "id": "1tNul8Si6lbs4k5FJF09KEAFAtWyskUkc",
        "name": "DERECHO DEL TRABAJO.pdf",
        "label": "Derecho del trabajo"
      },
      {
        "type": "file",
        "id": "1_piD8_rDok2_PufvTvliVVicepsntk0g",
        "name": "Investigación operativa TI 02.docx",
        "label": "Investigación Operativa"
      },
      {
        "type": "file",
        "id": "1cNsHMr6oTcD_aawx6OGMD0p6q71UIvP_",
        "name": "Lab Programacion 6to.pdf",
        "label": "Laboratorio de Programación"
      },
      {
        "type": "file",
        "id": "1KaDkjR4TwS1BO_7ZojdvBVHRPV1U5I3Q",
        "name": "Laboratorio de Hardware III Acreditaciones pendientes.docx",
        "label": "Laboratorio de Hardware"
      },
      {
        "type": "file",
        "id": "1vpRYJvkFl22ESTYMPbRtSVvNXqAvpYF2",
        "name": "Sist.Digitales6°.docx",
        "label": "Sistemas Digitales"
      },
      {
        "type": "file",
        "id": "1VYCyxKy5VSoQ8IdYPscrCdhE5ZVjZTOa",
        "name": "Trabajo Integrador Seg Inf.pdf",
        "label": "Seguridad Informática"
      },
      {
        "type": "file",
        "id": "14Ev5mnJjh8btf4qfFCRuS77geAxyurP3",
        "name": "Archivo",
        "label": "Laboratorio de Aplicaciones"
      }
    ]
  },
  {
    "title": "Sexto año-Programación",
    "items": [
      {
        "type": "file",
        "id": "1SVVDgvuLMD076S_NjOhw_gFpn_nprYw3",
        "name": "Tp 6.3- Lit. y Arte.pdf",
        "label": "Literatura"
      },
      {
        "type": "file",
        "id": "1JtluxwoqhPmunR2wdvEQYKyN9vK1wKO0",
        "name": "6° año Tecnica..pdf",
        "label": "Ingles"
      },
      {
        "type": "file",
        "id": "1n90E3k6kSBCEdhbJyhR6_dCsoV36tDxt",
        "name": "PROGRAMA EDUCACIÓN FÍSICA CICLO SUPERIOR 6°AÑO.docx",
        "label": "Educación Física"
      },
      {
        "type": "file",
        "id": "1FexBSh5ZHC1qeJofu2oE3z_bmVv4pCE_",
        "name": "FILOSOFÍA  T. P.. N° 3.",
        "label": "Filosofía"
      },
      {
        "type": "file",
        "id": "1SVVDgvuLMD076S_NjOhw_gFpn_nprYw3",
        "name": "Tp 6.3- Lit. y Arte.pdf",
        "label": "Arte"
      },
      {
        "type": "file",
        "id": "1NlmKDBvliu4V79TbhHK2YT0Vq7OL-mI4",
        "name": "Matemática Discreta 6to año PREVIA.docx",
        "label": "Matemática Discreta"
      },
      {
        "type": "file",
        "id": "1mKEFeRKGswTcGuHh5sCFDsdc99hPe7tg",
        "name": "TRABAJO PRÁCTICO INTEGRADOR – SISTEMAS DIGITALES 2.pdf",
        "label": "Sistemas Digitales"
      },
      {
        "type": "file",
        "id": "1wCIuh-lMPj9vzPmxbKXREZ0Wd4AAS1fd",
        "name": "Trabajo Integrador de Sistemas de Gestión y Autogestión.pdf",
        "label": "Sistemas de Gestion y Autogestion"
      },
      {
        "type": "file",
        "id": "1uXtFQwvL6wBE4q2pgHqiq0WB7uK4VGG6",
        "name": "Trabajo integrador seguridad informática.pdf",
        "label": "Seguridad Informática"
      },
      {
        "type": "file",
        "id": "13U8eacSsqo5GsDDeDge1o6ZtE5JzROZJ",
        "name": "INTENSIFICACION-  DERECHO DEL TRABAJO 6º 3ª.docx",
        "label": "Derecho del Trabajo"
      },
      {
        "type": "file",
        "id": "1o1apImKakhowUiAgCshRBr9nVPLMKpwE",
        "name": "Mesa_CC_LPI.doc",
        "label": "Laboratorio de Procesos Industriales"
      },
      {
        "type": "file",
        "id": "1n8bs5Q2lAVzSQUfH4XuneIESLp1NZo2j",
        "name": "Previo Laboratorio Aplicaciones 6to.pdf",
        "label": "Lab.de Diseño Web Estático"
      },
      {
        "type": "file",
        "id": "1rqsmqPE-i4RxD0IamSnhFp1JbsvD91HV",
        "name": "Previos 2025.pdf",
        "label": "Lab.de Diseño Web Dinámico"
      },
      {
        "type": "file",
        "id": "1DyZ9F-XXevGErBmHS75JxfRJdkT_tSPd",
        "name": "Previos 2025-prog.pdf",
        "label": "Lab. de Programación III"
      }
    ]
  },
  {
    "title": "Séptimo año-Informática",
    "items": [
      {
        "type": "file",
        "id": "18LeCssG2ZxdX95OkcIyg3MQfngajoxOR",
        "name": "Modelos y sistemas 7mo.docx",
        "label": "Modelos y Sistemas"
      },
      {
        "type": "file",
        "id": "1QHt7IJSkPPKaHr62a40sheC-UBPi3sTE",
        "name": "Evaluacion de proyectos.pdf",
        "label": "Evaluacion de Proyectos"
      },
      {
        "type": "file",
        "id": "1WxQFryjdLD3d26eTAcKtDhsE7mvfg9n5",
        "name": "EPyDL.docx",
        "label": "Emprendimientos Productivos y Desarrollo Local"
      },
      {
        "type": "file",
        "id": "1ZnvC1k38rvrFgTvyIfibVCv55FY2iP_P",
        "name": "IMRRI - Completa Carrera 2025_6.pdf",
        "label": "I.M.R.R.I"
      },
      {
        "type": "file",
        "id": "1-SDWdZ9ZGOxIx1P71cKLx7UfWr8KhZaQ",
        "name": "Base de Datos 7mo.pdf",
        "label": "Base de Datos"
      },
      {
        "type": "file",
        "id": "1Cxf85nv5h4MFPBBHke7yBWO8OxvCEWWP",
        "name": "Previas_pdisc.pdf",
        "label": "P.D.I.S.C"
      },
      {
        "type": "file",
        "id": "19o7CdmypBzzolh3afqdYKzJRmbg8oZat",
        "name": "Mesa_CC_IMRSC.docx",
        "label": "IMRSC"
      }
    ]
  },
  {
    "title": "Séptimo año- Programación",
    "items": [
      {
        "type": "file",
        "id": "1WxQFryjdLD3d26eTAcKtDhsE7mvfg9n5",
        "name": "EPyDL.docx",
        "label": "Emprendimientos Productivos y Desarrollo Local"
      },
      {
        "type": "file",
        "id": "1QHt7IJSkPPKaHr62a40sheC-UBPi3sTE",
        "name": "Evaluacion de proyectos.pdf",
        "label": "Evaluacion de Proyectos"
      },
      {
        "type": "file",
        "id": "1yc2c6RDeg94f-WG-6cJI_L3eBhqJc35z",
        "name": "Trabajo Completa carrera  de Organización y Métodos (2).pdf",
        "label": "Organizacion y Metodos"
      },
      {
        "type": "file",
        "id": "1Cxf85nv5h4MFPBBHke7yBWO8OxvCEWWP",
        "name": "Previas_pdisc.pdf",
        "label": "P.D.I.S.C"
      },
      {
        "type": "file",
        "id": "1r7sxhceO6KiHsSrZfDf7RNw6d9ylxBDf",
        "name": "TP PISWD (1).pdf",
        "label": "P.I.S.W.D"
      },
      {
        "type": "file",
        "id": "1T73oo6UTVZM1-T_c4h9KuqYUpzy_kLzs",
        "name": "proyecto integrador.docx.pdf",
        "label": "D.I.S.P.M"
      },
      {
        "type": "text",
        "text": "FORMULARIO DE INSCRIPCIÓN"
      }
    ]
  },
  {
    "title": "FECHAS PARA COMPLETA CARRERA MARZO 2026",
    "items": []
  }
] as Section[];
