<?php

namespace thekitchenagency\craftmapboxfield\resources;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

/**
 * Asset bundle for the Mapbox Map field.
 */
class MapboxFieldAssets extends AssetBundle
{
    /**
     * @inheritdoc
     */
    public function init()
    {
        $this->sourcePath = '@thekitchenagency/craftmapboxfield/resources/';

        $this->depends = [
            CpAsset::class,
        ];

        $this->js = [
            'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js',
            'js/field.js',
        ];

        $this->css = [
            'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css',
            'css/field.css',
        ];

        parent::init();
    }
}
