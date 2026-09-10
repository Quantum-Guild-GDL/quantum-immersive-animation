# Quantum Field — instalación inmersiva de 8 pantallas

Prototipo generativo sin dependencias ni licencias. Representa superposición, esferas de Bloch, compuertas cuánticas, entrelazamiento y medición en un loop de 72 segundos.

## Referencias visuales

Estas capturas muestran la composición panorámica provisional y la división del lienzo en ocho canales.

![Campo cuántico panorámico dividido en ocho pantallas](assets/references/installation-reference-01.png)

![Ocho esferas de Bloch distribuidas entre las pantallas](assets/references/installation-reference-02.png)

## Abrir la previsualización

En macOS, haz doble clic en `Iniciar Quantum Field.command`. Se abrirá el navegador y una ventana de Terminal; mantén esa ventana abierta durante la reproducción.

También puedes abrir `index.html` directamente en Chrome o iniciar un servidor local:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Controles

- `F`: pantalla completa.
- `Espacio`: pausar o continuar.
- `G`: mostrar u ocultar las divisiones de las 8 pantallas.

## Salida individual por pantalla

Cada salida muestra su segmento del panorama completo:

- `http://localhost:8080/?screen=1`
- `http://localhost:8080/?screen=2`
- …
- `http://localhost:8080/?screen=8`

Los canales usan el reloj del sistema para mantenerse en el mismo punto del loop. Si se ejecutan en varios equipos, sincroniza sus relojes mediante la configuración automática de fecha y hora. Para la instalación final se reemplazará el mapeo provisional por las proporciones reales de los paneles.
