import '../../../stub_loader';
import {test} from '../../../util/test';
import AttributionControl from '../../../../rollup/build/tsc/src/ui/control/attribution_control';
import {createMap as globalCreateMap} from '../../../util';
import simulate from '../../../util/simulate_interaction';

function createMap(t) {

    return globalCreateMap(t, {
        attributionControl: false,
        style: {
            version: 8,
            sources: {},
            layers: [],
            owner: 'mapbox',
            id: 'streets-v10',
        },
        hash: true
    });
}

test('AttributionControl appears in bottom-right by default', (t) => {
    const map = createMap(t);
    map.addControl(new AttributionControl());

    t.equal(map.getContainer().querySelectorAll('.maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib').length, 1);
    t.end();
});

test('AttributionControl appears in the position specified by the position option', (t) => {
    const map = createMap(t);
    map.addControl(new AttributionControl(), 'top-left');

    t.equal(map.getContainer().querySelectorAll('.maplibregl-ctrl-top-left .maplibregl-ctrl-attrib').length, 1);
    t.end();
});

test('AttributionControl appears in compact mode if compact option is used', (t) => {
    const map = createMap(t);
    Object.defineProperty(map.getCanvasContainer(), 'offsetWidth', {value: 700, configurable: true});

    let attributionControl = new AttributionControl({
        compact: true
    });
    map.addControl(attributionControl);

    const container = map.getContainer();

    t.equal(container.querySelectorAll('.maplibregl-ctrl-attrib.maplibregl-compact').length, 1);
    map.removeControl(attributionControl);

    Object.defineProperty(map.getCanvasContainer(), 'offsetWidth', {value: 600, configurable: true});
    attributionControl = new AttributionControl({
        compact: false
    });

    map.addControl(attributionControl);
    t.equal(container.querySelectorAll('.maplibregl-ctrl-attrib:not(.maplibregl-compact)').length, 1);
    t.end();
});

test('AttributionControl appears in compact mode if container is less then 640 pixel wide', (t) => {
    const map = createMap(t);
    Object.defineProperty(map.getCanvasContainer(), 'offsetWidth', {value: 700, configurable: true});
    map.addControl(new AttributionControl());

    const container = map.getContainer();

    t.equal(container.querySelectorAll('.maplibregl-ctrl-attrib:not(.maplibregl-compact)').length, 1);

    Object.defineProperty(map.getCanvasContainer(), 'offsetWidth', {value: 600, configurable: true});
    map.resize();

    t.equal(container.querySelectorAll('.maplibregl-ctrl-attrib.maplibregl-compact').length, 1);
    t.end();
});

test('AttributionControl compact mode control toggles attribution', (t) => {
    const map = createMap(t);
    map.addControl(new AttributionControl({
        compact: true
    }));

    const container = map.getContainer();
    const toggle = container.querySelector('.maplibregl-ctrl-attrib-button');

    t.equal(container.querySelectorAll('.maplibregl-compact-show').length, 0);

    simulate.click(toggle);

    t.equal(container.querySelectorAll('.maplibregl-compact-show').length, 1);

    simulate.click(toggle);

    t.equal(container.querySelectorAll('.maplibregl-compact-show').length, 0);

    t.end();
});

test('AttributionControl dedupes attributions that are substrings of others', (t) => {
    const map = createMap(t);
    const attribution = new AttributionControl();
    map.addControl(attribution);

    map.on('load', () => {
        map.addSource('1', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'World'});
        map.addSource('2', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Hello World'});
        map.addSource('3', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Another Source'});
        map.addSource('4', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Hello'});
        map.addSource('5', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Hello World'});
        map.addSource('6', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Hello World'});
        map.addSource('7', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'GeoJSON Source'});
        map.addLayer({id: '1', type: 'fill', source: '1'});
        map.addLayer({id: '2', type: 'fill', source: '2'});
        map.addLayer({id: '3', type: 'fill', source: '3'});
        map.addLayer({id: '4', type: 'fill', source: '4'});
        map.addLayer({id: '5', type: 'fill', source: '5'});
        map.addLayer({id: '6', type: 'fill', source: '6'});
        map.addLayer({id: '7', type: 'fill', source: '7'});
    });

    let times = 0;
    map.on('data', (e) => {
        if (e.dataType === 'source' && e.sourceDataType === 'metadata') {
            if (++times === 7) {
                t.equal(attribution._innerContainer.innerHTML, 'Hello World | Another Source | GeoJSON Source');
                t.end();
            }
        }
    });
});

test('AttributionControl is hidden if empty', (t) => {
    const map = createMap(t);
    const attribution = new AttributionControl();
    map.addControl(attribution);
    map.on('load', () => {
        map.addSource('1', {type: 'geojson', data: {type: 'FeatureCollection', features: []}});
        map.addLayer({id: '1', type: 'fill', source: '1'});
    });

    const container = map.getContainer();

    const checkEmptyFirst = () => {
        t.equal(attribution._innerContainer.innerHTML, '');
        t.equal(container.querySelectorAll('.maplibregl-attrib-empty').length, 1, 'includes empty class when no attribution strings are provided');

        map.addSource('2', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Hello World'});
        map.addLayer({id: '2', type: 'fill', source: '2'});
    };

    const checkNotEmptyLater = () => {
        t.equal(attribution._innerContainer.innerHTML, 'Hello World');
        t.equal(container.querySelectorAll('.maplibregl-attrib-empty').length, 0, 'removes empty class when source with attribution is added');
        t.end();
    };

    let times = 0;
    map.on('data', (e) => {
        if (e.dataType === 'source' && e.sourceDataType === 'metadata') {
            times++;
            if (times === 1) {
                checkEmptyFirst();
            } else if (times === 2) {
                checkNotEmptyLater();
            }
        }
    });
});

test('AttributionControl shows custom attribution if customAttribution option is provided', (t) => {
    const map = createMap(t);
    const attributionControl = new AttributionControl({
        customAttribution: 'Custom string'
    });
    map.addControl(attributionControl);

    t.equal(attributionControl._innerContainer.innerHTML, 'Custom string');
    t.end();
});

test('AttributionControl shows custom attribution if customAttribution option is provided, control is removed and added back', (t) => {
    const map = createMap(t);
    const attributionControl = new AttributionControl({
        customAttribution: 'Custom string'
    });
    map.addControl(attributionControl);
    map.removeControl(attributionControl);
    map.addControl(attributionControl);

    t.equal(attributionControl._innerContainer.innerHTML, 'Custom string');
    t.end();
});

test('AttributionControl in compact mode shows custom attribution if customAttribution option is provided', (t) => {
    const map = createMap(t);
    const attributionControl = new AttributionControl({
        customAttribution: 'Custom string',
        compact: true
    });
    map.addControl(attributionControl);

    t.equal(attributionControl._innerContainer.innerHTML, 'Custom string');
    t.end();
});

test('AttributionControl shows all custom attributions if customAttribution array of strings is provided', (t) => {
    const map = createMap(t);
    const attributionControl = new AttributionControl({
        customAttribution: ['Some very long custom string', 'Custom string', 'Another custom string']
    });
    map.addControl(attributionControl);

    t.equal(
        attributionControl._innerContainer.innerHTML,
        'Custom string | Another custom string | Some very long custom string'
    );
    t.end();
});

test('AttributionControl hides attributions for sources that are not currently visible', (t) => {
    const map = createMap(t);
    const attribution = new AttributionControl();
    map.addControl(attribution);

    map.on('load', () => {
        map.addSource('1', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Used'});
        map.addSource('2', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Not used'});
        map.addSource('3', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Vibility none'});
        map.addLayer({id: '1', type: 'fill', source: '1'});
        map.addLayer({id: '3', type: 'fill', source: '3', layout: {visibility: 'none'}});
    });

    let times = 0;
    map.on('data', (e) => {
        if (e.dataType === 'source' && e.sourceDataType === 'metadata') {
            if (++times === 3) {
                t.equal(attribution._innerContainer.innerHTML, 'Used');
                t.end();
            }
        }
    });
});

test('AttributionControl toggles attributions for sources whose visibility changes when zooming', (t) => {
    const map = createMap(t);
    const attribution = new AttributionControl();
    map.addControl(attribution);

    map.on('load', () => {
        map.addSource('1', {type: 'geojson', data: {type: 'FeatureCollection', features: []}, attribution: 'Used'});
        map.addLayer({id: '1', type: 'fill', source: '1', minzoom: 12});
    });

    map.on('data', (e) => {
        if (e.dataType === 'source' && e.sourceDataType === 'metadata') {
            t.equal(attribution._innerContainer.innerHTML, '');
            map.setZoom(13);
        }
        if (e.dataType === 'source' && e.sourceDataType === 'visibility') {
            if (map.getZoom() === 13) {
                t.equal(attribution._innerContainer.innerHTML, 'Used');
                t.end();
            }
        }
    });
});
