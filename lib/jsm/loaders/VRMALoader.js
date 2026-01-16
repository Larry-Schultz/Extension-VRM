import {
    AnimationClip,
    FileLoader,
    Loader,
    QuaternionKeyframeTrack,
    VectorKeyframeTrack
} from "../../three.module.js";

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
        loader.load( url, function ( text ) {

            try {

                onLoad( scope.parse( text ) );

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
