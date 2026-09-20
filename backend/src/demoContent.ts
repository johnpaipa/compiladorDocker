export interface DemoQuestion {
  title: string;
  description: string;
  language: string;
  score: number;
  // [entrada, salida esperada]
  cases: [string, string][];
}

export interface DemoAssessment {
  name: string;
  description: string;
  timeLimit: number;
  questions: DemoQuestion[];
}

const ALL = 'java,javascript,python';

export const DEMO_ASSESSMENTS: DemoAssessment[] = [
  {
    name: 'Fundamentos de Algoritmos',
    description: 'Ejercicios básicos de lógica: arreglos, cadenas y ciclos.',
    timeLimit: 45,
    questions: [
      {
        title: 'Máximo de un arreglo',
        description:
          'Se recibe una línea con números enteros separados por espacio. Imprime el mayor.\n\nEntrada: 3 5 1 8\nSalida: 8',
        language: ALL,
        score: 20,
        cases: [
          ['3 5 1 8', '8'],
          ['-4 -9 -1', '-1'],
          ['42', '42'],
          ['7 7 7', '7'],
          ['100 2 99 101 -5', '101'],
        ],
      },
      {
        title: 'Palíndromo',
        description:
          'Se recibe una palabra en minúsculas, sin espacios. Imprime SI si se lee igual al derecho y al revés, o NO en caso contrario.\n\nEntrada: reconocer\nSalida: SI',
        language: ALL,
        score: 20,
        cases: [
          ['reconocer', 'SI'],
          ['programa', 'NO'],
          ['a', 'SI'],
          ['anilina', 'SI'],
          ['ab', 'NO'],
        ],
      },
      {
        title: 'FizzBuzz',
        description:
          'Dado un entero N, imprime los números de 1 a N, uno por línea. Si el número es múltiplo de 3 imprime Fizz, si es múltiplo de 5 imprime Buzz, y si es múltiplo de ambos imprime FizzBuzz.\n\nEntrada: 5\nSalida:\n1\n2\nFizz\n4\nBuzz',
        language: ALL,
        score: 20,
        cases: [
          ['5', '1\n2\nFizz\n4\nBuzz'],
          ['15', '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz'],
          ['1', '1'],
          ['3', '1\n2\nFizz'],
        ],
      },
      {
        title: 'Factorial',
        description:
          'Dado un entero n entre 0 y 15, imprime n! (el factorial de n). Recuerda que 0! = 1.\n\nEntrada: 5\nSalida: 120',
        language: ALL,
        score: 20,
        cases: [
          ['5', '120'],
          ['0', '1'],
          ['1', '1'],
          ['10', '3628800'],
          ['15', '1307674368000'],
        ],
      },
      {
        title: 'Contar vocales',
        description:
          'Se recibe una línea de texto en minúsculas y sin tildes. Imprime cuántas vocales (a, e, i, o, u) contiene.\n\nEntrada: hola mundo\nSalida: 4',
        language: ALL,
        score: 20,
        cases: [
          ['hola mundo', '4'],
          ['xyz', '0'],
          ['murcielago', '5'],
          ['aeiou', '5'],
          ['programacion es divertida', '10'],
        ],
      },
    ],
  },
  {
    name: 'Cadenas y Listas',
    description: 'Manipulación de texto y colecciones: inversión, anagramas, primos y conteos.',
    timeLimit: 30,
    questions: [
      {
        title: 'Invertir una cadena',
        description: 'Se recibe una línea de texto. Imprímela al revés, respetando mayúsculas y espacios.\n\nEntrada: hola\nSalida: aloh',
        language: ALL,
        score: 20,
        cases: [
          ['hola', 'aloh'],
          ['Kata FullStack', 'kcatSlluF ataK'],
          ['a', 'a'],
          ['12345', '54321'],
        ],
      },
      {
        title: 'Anagramas',
        description:
          'Se reciben dos palabras en minúsculas separadas por un espacio. Imprime SI si una es anagrama de la otra (mismas letras en distinto orden) o NO si no lo es.\n\nEntrada: roma amor\nSalida: SI',
        language: ALL,
        score: 20,
        cases: [
          ['roma amor', 'SI'],
          ['hola halo', 'SI'],
          ['casa caso', 'NO'],
          ['abc ab', 'NO'],
          ['listen silent', 'SI'],
        ],
      },
      {
        title: 'Segundo mayor',
        description:
          'Se recibe una línea con enteros separados por espacio (al menos dos valores distintos). Imprime el segundo mayor valor distinto.\n\nEntrada: 3 5 1 8\nSalida: 5',
        language: ALL,
        score: 20,
        cases: [
          ['3 5 1 8', '5'],
          ['10 10 9', '9'],
          ['-1 -5 -3', '-3'],
          ['1 2', '1'],
          ['4 9 9 9 2', '4'],
        ],
      },
      {
        title: 'Números primos',
        description:
          'Dado un entero N (N >= 2), imprime en una sola línea todos los números primos menores o iguales a N, separados por un espacio.\n\nEntrada: 10\nSalida: 2 3 5 7',
        language: ALL,
        score: 20,
        cases: [
          ['10', '2 3 5 7'],
          ['2', '2'],
          ['30', '2 3 5 7 11 13 17 19 23 29'],
          ['20', '2 3 5 7 11 13 17 19'],
        ],
      },
      {
        title: 'Contar palabras',
        description:
          'Se recibe una línea de texto. Las palabras están separadas por uno o más espacios y la línea puede empezar o terminar con espacios. Imprime cuántas palabras tiene.\n\nEntrada: hola mundo\nSalida: 2',
        language: ALL,
        score: 20,
        cases: [
          ['hola mundo', '2'],
          ['  uno   dos tres ', '3'],
          ['kata', '1'],
          ['a b c d e f', '6'],
        ],
      },
    ],
  },
  {
    name: 'Prueba Rápida (5 minutos)',
    description: 'Evaluación corta con tiempo límite muy bajo, pensada para probar el cronómetro y el cierre por tiempo.',
    timeLimit: 5,
    questions: [
      {
        title: 'Saludo',
        description: 'Se recibe un nombre (puede tener espacios). Imprime Hola, <nombre>!\n\nEntrada: Ana\nSalida: Hola, Ana!',
        language: ALL,
        score: 50,
        cases: [
          ['Ana', 'Hola, Ana!'],
          ['Carlos Ruiz', 'Hola, Carlos Ruiz!'],
          ['Luz', 'Hola, Luz!'],
        ],
      },
      {
        title: 'Par o impar',
        description: 'Dado un entero (puede ser negativo), imprime PAR o IMPAR.\n\nEntrada: 4\nSalida: PAR',
        language: ALL,
        score: 50,
        cases: [
          ['4', 'PAR'],
          ['7', 'IMPAR'],
          ['0', 'PAR'],
          ['-3', 'IMPAR'],
          ['100', 'PAR'],
        ],
      },
    ],
  },
  {
    name: 'Reto Plus: TypeScript y COBOL',
    description: 'Ejercicios que solo se pueden resolver en TypeScript o en COBOL, para probar los lenguajes plus del motor de ejecución.',
    timeLimit: 40,
    questions: [
      {
        title: 'Suma de un arreglo (TypeScript)',
        description:
          'Se recibe una línea con enteros separados por espacio. Imprime la suma. Resuélvelo en TypeScript.\n\nEntrada: 1 2 3 4\nSalida: 10',
        language: 'typescript',
        score: 30,
        cases: [
          ['1 2 3 4', '10'],
          ['-5 5', '0'],
          ['100', '100'],
          ['1 1 1 1 1 1', '6'],
        ],
      },
      {
        title: 'Frecuencia de palabras (TypeScript)',
        description:
          'Se recibe una línea de palabras separadas por espacio. Imprime cada palabra distinta con la cantidad de veces que aparece, en orden alfabético, una por línea con el formato palabra:cantidad.\n\nEntrada: b a b c a b\nSalida:\na:2\nb:3\nc:1',
        language: 'typescript',
        score: 40,
        cases: [
          ['b a b c a b', 'a:2\nb:3\nc:1'],
          ['x', 'x:1'],
          ['hola hola hola', 'hola:3'],
          ['z y x', 'x:1\ny:1\nz:1'],
        ],
      },
      {
        title: 'Suma de dos enteros (COBOL)',
        description:
          'Se recibe una línea con dos enteros no negativos separados por un espacio. Imprime su suma. Resuélvelo en COBOL.\n\nEntrada: 2 3\nSalida: 5',
        language: 'cobol',
        score: 30,
        cases: [
          ['2 3', '5'],
          ['10 20', '30'],
          ['0 0', '0'],
          ['100 250', '350'],
        ],
      },
      {
        title: 'Mayor de dos números (COBOL)',
        description:
          'Se recibe una línea con dos enteros no negativos separados por un espacio. Imprime el mayor. Resuélvelo en COBOL.\n\nEntrada: 4 9\nSalida: 9',
        language: 'cobol',
        score: 30,
        cases: [
          ['4 9', '9'],
          ['15 3', '15'],
          ['7 7', '7'],
          ['0 100', '100'],
        ],
      },
    ],
  },
  {
    name: 'Assessment Full Stack Cloud',
    description: 'Problemas del día a día en aplicaciones web y cloud: validación, logs, balanceo y direcciones.',
    timeLimit: 60,
    questions: [
      {
        title: 'Paréntesis balanceados',
        description:
          'Se recibe una cadena que solo contiene ( ) [ ] { }. Imprime VALIDO si todos los símbolos abren y cierran en el orden correcto, o INVALIDO en caso contrario.\n\nEntrada: ([]{})\nSalida: VALIDO',
        language: ALL,
        score: 20,
        cases: [
          ['([]{})', 'VALIDO'],
          ['(]', 'INVALIDO'],
          ['((())', 'INVALIDO'],
          ['{[()()]}', 'VALIDO'],
          [')(', 'INVALIDO'],
        ],
      },
      {
        title: 'Códigos de estado HTTP',
        description:
          'La primera línea trae n, la cantidad de respuestas de un servidor. Las siguientes n líneas traen un código de estado cada una. Imprime cuántos son errores de cliente (4xx) y cuántos de servidor (5xx) con el formato 4xx=<a> 5xx=<b>.\n\nEntrada:\n5\n200\n404\n500\n404\n301\nSalida: 4xx=2 5xx=1',
        language: ALL,
        score: 20,
        cases: [
          ['5\n200\n404\n500\n404\n301', '4xx=2 5xx=1'],
          ['3\n200\n201\n204', '4xx=0 5xx=0'],
          ['4\n500\n502\n503\n404', '4xx=1 5xx=3'],
          ['1\n418', '4xx=1 5xx=0'],
        ],
      },
      {
        title: 'Balanceador round-robin',
        description:
          'Se reciben dos enteros: n servidores (numerados de 1 a n) y m peticiones. Las peticiones se reparten en orden circular empezando por el servidor 1. Imprime en una línea el servidor que atiende cada petición, separados por espacio.\n\nEntrada: 3 7\nSalida: 1 2 3 1 2 3 1',
        language: ALL,
        score: 20,
        cases: [
          ['3 7', '1 2 3 1 2 3 1'],
          ['1 3', '1 1 1'],
          ['4 4', '1 2 3 4'],
          ['2 5', '1 2 1 2 1'],
        ],
      },
      {
        title: 'Tamaño legible',
        description:
          'Dado un tamaño en bytes, imprímelo en la unidad más grande posible (B, KB, MB o GB) usando división entera y 1024 como factor. Formato: <valor> <unidad>.\n\nEntrada: 1536\nSalida: 1 KB',
        language: ALL,
        score: 20,
        cases: [
          ['1536', '1 KB'],
          ['500', '500 B'],
          ['5242880', '5 MB'],
          ['1073741824', '1 GB'],
          ['1023', '1023 B'],
          ['2097151', '1 MB'],
        ],
      },
      {
        title: 'IPs únicas',
        description:
          'La primera línea trae n, la cantidad de accesos registrados. Las siguientes n líneas traen la dirección IP de cada acceso. Imprime cuántas direcciones distintas hay.\n\nEntrada:\n5\n10.0.0.1\n10.0.0.2\n10.0.0.1\n192.168.1.1\n10.0.0.2\nSalida: 3',
        language: ALL,
        score: 20,
        cases: [
          ['5\n10.0.0.1\n10.0.0.2\n10.0.0.1\n192.168.1.1\n10.0.0.2', '3'],
          ['1\n8.8.8.8', '1'],
          ['3\n1.1.1.1\n1.1.1.1\n1.1.1.1', '1'],
          ['4\n1.1.1.1\n1.1.1.2\n1.1.1.3\n1.1.1.4', '4'],
        ],
      },
    ],
  },
];
