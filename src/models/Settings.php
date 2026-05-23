<?php

namespace thekitchenagency\craftmapboxfield\models;

use craft\base\Model;

/**
 * Mapbox Field settings
 */
class Settings extends Model
{
    public string $mapboxAccessToken = '';
    public string $defaultStyle = 'mapbox://styles/mapbox/streets-v12';
    public float $defaultLatitude = 46.8182;
    public float $defaultLongitude = 8.2275;
    public float $defaultZoom = 8.0;

    public function rules(): array
    {
        return [
            [['mapboxAccessToken', 'defaultStyle'], 'string'],
            [['defaultLatitude', 'defaultLongitude', 'defaultZoom'], 'number'],
            [['defaultLatitude'], 'double', 'min' => -90, 'max' => 90],
            [['defaultLongitude'], 'double', 'min' => -180, 'max' => 180],
            [['defaultZoom'], 'double', 'min' => 0, 'max' => 22],
        ];
    }
}
