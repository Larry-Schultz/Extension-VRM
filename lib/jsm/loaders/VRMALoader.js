import { VRMAnimationLoader } from '../three-vrm.module.js';
import { Skeleton } from '../../three.module.js';

/**
 * VRMALoader: Loads .vrma animation files and outputs { skeleton, clip } like BVHLoader
 * @param {string} url - The URL of the .vrma file
 * @param {Object} vrm - The target VRM model (for skeleton reference)
 * @returns {Promise<{ skeleton: Skeleton, clip: AnimationClip }>} Unified output
 */
export class VRMALoader {
  constructor(manager) {
    this.manager = manager;
  }

  async loadAsync(url, vrm) {
    // Use VRMAnimationLoader from @pixiv/three-vrm
    const loader = new VRMAnimationLoader();
    const { animation } = await loader.load(url);
    // Use the VRM's skeleton for consistency
    const skeleton = vrm && vrm.scene ? vrm.scene.skeleton : null;
    return {
      skeleton: skeleton || null,
      clip: animation
    };
  }
}
