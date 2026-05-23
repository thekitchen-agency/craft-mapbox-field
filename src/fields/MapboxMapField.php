<?php

namespace thekitchenagency\craftmapboxfield\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\db\Db;
use craft\helpers\Json;
use thekitchenagency\craftmapboxfield\MapboxField;
use thekitchenagency\craftmapboxfield\models\MapboxFieldValue;
use thekitchenagency\craftmapboxfield\resources\MapboxFieldAssets;

/**
 * Mapbox Map field type
 */
class MapboxMapField extends Field
{
    public bool $allowMultipleMarkers = true;
    public bool $allowAddressSearch = true;
    public bool $allowMarkerDrag = true;
    public string $mapStyle = '';

    public static function displayName(): string
    {
        return Craft::t('mapbox-field', 'Mapbox Map');
    }

    /**
     * @inheritdoc
     */
    public static function icon(): string
    {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>';
    }

    public function getContentColumnType(): array|string
    {
        return Db::TYPE_TEXT;
    }

    public function rules(): array
    {
        $rules = parent::rules();
        return array_merge($rules, [
            [['allowMultipleMarkers', 'allowAddressSearch', 'allowMarkerDrag'], 'boolean'],
            [['mapStyle'], 'string'],
        ]);
    }

    public function getSettingsHtml(): ?string
    {
        return Craft::$app->getView()->renderTemplate('mapbox-field/_field_settings.twig', [
            'field' => $this,
        ]);
    }

    public function normalizeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value instanceof MapboxFieldValue) {
            return $value;
        }

        $pluginSettings = MapboxField::getInstance()->getSettings();
        
        $defaults = [
            'lat' => $pluginSettings->defaultLatitude,
            'lng' => $pluginSettings->defaultLongitude,
            'zoom' => $pluginSettings->defaultZoom,
            'address' => '',
            'markers' => [],
        ];

        if (empty($value)) {
            return new MapboxFieldValue($defaults);
        }

        if (is_string($value)) {
            $decoded = Json::decodeIfJson($value);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = [];
            }
        }

        if (is_array($value)) {
            $data = array_merge($defaults, $value);
            return new MapboxFieldValue($data);
        }

        return new MapboxFieldValue($defaults);
    }

    public function serializeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value instanceof MapboxFieldValue) {
            return Json::encode($value->toArray());
        }

        return parent::serializeValue($value, $element);
    }

    protected function inputHtml(mixed $value, ?ElementInterface $element, bool $inline): string
    {
        // Register CP Assets
        Craft::$app->getView()->registerAssetBundle(MapboxFieldAssets::class);

        $pluginSettings = MapboxField::getInstance()->getSettings();

        // Pass settings and value to the field input template
        return Craft::$app->getView()->renderTemplate('mapbox-field/_field_input.twig', [
            'name' => $this->handle,
            'value' => $value,
            'field' => $this,
            'mapboxToken' => $pluginSettings->mapboxAccessToken,
            'defaultStyle' => !empty($this->mapStyle) ? $this->mapStyle : $pluginSettings->defaultStyle,
        ]);
    }
}
