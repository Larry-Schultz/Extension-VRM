import {
    AnimationClip,
    FileLoader,
    Loader,
    QuaternionKeyframeTrack,
    VectorKeyframeTrack,
    NumberKeyframeTrack
} from "../../three.module.js";
import { GLTFLoader } from './GLTFLoader.js';

class VRMALoader extends Loader {

    constructor( manager ) {

        super( manager );

    }

    load( url, onLoad, onProgress, onError ) {

        const scope = this;

        const loader = new FileLoader( scope.manager );
        loader.setPath( scope.path );
        loader.setRequestHeader( scope.requestHeader );
        loader.setWithCredentials( scope.withCredentials );
        // request as arraybuffer so we can detect binary glTF (GLB)
        loader.setResponseType( 'arraybuffer' );
        loader.load( url, function ( data ) {

            try {
                // If data is ArrayBuffer, check header
                if ( data instanceof ArrayBuffer ) {
                    const header = String.fromCharCode.apply(null, new Uint8Array(data.slice(0,4)));
                    if ( header === 'glTF' ) {
                        // binary glTF (GLB) — parse with GLTFLoader and extract first animation clip if present
                        const gltfLoader = new GLTFLoader();
                        gltfLoader.parse( data, scope.path || '', function ( gltf ) {
                            // find animation clip
                            const clip = (gltf.animations && gltf.animations.length > 0) ? gltf.animations[0] : null;
                            onLoad( { clip: clip } );
                        }, function ( e ) {
                            throw e;
                        } );
                        return;
                    }
                    else {
                        // try decode as text and parse JSON
                        const text = new TextDecoder().decode( data );
                        onLoad( scope.parse( text ) );
                        return;
                    }
                }

                // fallback: assume string
                onLoad( scope.parse( data ) );

            } catch ( e ) {

                if ( onError ) {

                    onError( e );

                } else {

                    console.error( e );

                }

                scope.manager.itemError( url );

            }

        }, onProgress, onError );

    }

    /**
     * Parse VRMA content. Expect JSON string with structure:
     * { "duration": number, "tracks": [ { "name": "bone.property", "times": [...], "values": [...] }, ... ] }
     * Returns an object { clip: AnimationClip }
     */
    parse( text ) {

        let data;
        try {
            data = JSON.parse( text );
        }
        catch ( e ) {
            throw new Error( 'VRMALoader: Failed to parse JSON: ' + e.message );
        }

        const tracks = [];

        if ( Array.isArray( data.tracks ) ) {
            data.tracks.forEach( ( t ) => {
                if ( typeof t.name !== 'string' || !Array.isArray( t.times ) || !Array.isArray( t.values ) ) return;

                const times = t.times;
                const values = t.values;

                // Determine stride by dividing values length by times length
                const stride = times.length > 0 ? Math.round( values.length / times.length ) : 0;

                if ( stride === 4 ) {
                    tracks.push( new QuaternionKeyframeTrack( t.name, times, values ) );
                }
                else if ( stride === 3 ) {
                    tracks.push( new VectorKeyframeTrack( t.name, times, values ) );
                }
                else if ( stride === 1 ) {
                    tracks.push( new NumberKeyframeTrack( t.name, times, values ) );
                }
                else {
                    // unsupported track stride, ignore
                }

            } );
        }

        const duration = data.duration !== undefined ? data.duration : ( tracks.length ? Math.max( ...tracks.map( tr => tr.times[ tr.times.length - 1 ] || 0 ) ) : -1 );

        return { clip: new AnimationClip( 'animation', duration, tracks ) };

    }

}

export { VRMALoader };
