<?php

namespace thekitchenagency\craftmapboxfield;

use Craft;
use craft\base\Model;
use craft\base\Plugin;
use craft\events\RegisterComponentTypesEvent;
use craft\services\Fields;
use thekitchenagency\craftmapboxfield\fields\MapboxMapField;
use thekitchenagency\craftmapboxfield\models\Settings;
use yii\base\Event;

/**
 * Mapbox Field plugin
 *
 * @method static MapboxField getInstance()
 * @method Settings getSettings()
 * @author thekitchen.agency <tech@thekitchen.agency>
 * @copyright thekitchen.agency
 * @license https://craftcms.github.io/license/ Craft License
 */
class MapboxField extends Plugin
{
    public string $schemaVersion = '1.0.0';
    public bool $hasCpSettings = true;

    public static function config(): array
    {
        return [
            'components' => [
                // Define component configs here...
            ],
        ];
    }

    public function init(): void
    {
        // Manually require model and field files to bypass DDEV/Composer cache autoloader issues
        require_once __DIR__ . '/models/MapboxFieldValue.php';
        require_once __DIR__ . '/fields/MapboxMapField.php';

        parent::init();

        $this->attachEventHandlers();

        // Any code that creates an element query or loads Twig should be deferred until
        // after Craft is fully initialized, to avoid conflicts with other plugins/modules
        Craft::$app->onInit(function() {
            // ...
        });
    }

    protected function createSettingsModel(): ?Model
    {
        return Craft::createObject(Settings::class);
    }

    protected function settingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate('mapbox-field/_settings.twig', [
            'plugin' => $this,
            'settings' => $this->getSettings(),
        ]);
    }

    private function attachEventHandlers(): void
    {
        // Register custom Mapbox Map field type
        Event::on(
            Fields::class,
            Fields::EVENT_REGISTER_FIELD_TYPES,
            function (RegisterComponentTypesEvent $event) {
                $event->types[] = MapboxMapField::class;
            }
        );
    }
}
