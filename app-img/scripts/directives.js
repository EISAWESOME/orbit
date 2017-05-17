/*global ob, window */
'use strict';
ob.directive('orbitview', ['Images', function (Images) {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: 'views/view.html',
        controller: function ($scope) {
            this.addTooltip = function (tooltip) {
                $scope.tooltips.push(tooltip);
            };

            this.addDescription = function (description) {
                $scope.description = description;
            };
        },
        link: function ($scope, $elem, $attr) {
            console.log('link');
            console.log(Images);

            //lecture du fichier xml associé à l'objet et retranscription des infos dans Images
            Images.loadxml().success(function(dataXML){
                console.log('success');

                if ( window.DOMParser ) { // Standard
                    var tmp = new DOMParser();
                    var xml = tmp.parseFromString( dataXML , "text/xml" );
                } else { // IE
                    var xml = new ActiveXObject( "Microsoft.XMLDOM" );
                    xml.async = "false";
                    xml.loadXML( dataXML );
                }

                var imgData = xml.getElementsByTagName('img');
                var scaleData = xml.getElementsByTagName('scale');

                Images.level = [];                              //niveaux de résolution
                Images.ext = imgData[0].getAttribute('ext');    //extension des fichiers images
                //pour chaque level(niveau de resolution)
                for (var i = 0; i < scaleData.length; i++) {
                    if(Number(scaleData[i].getAttribute('width')) > 200){
                        Images.level.push({
                            value: Number(scaleData[i].getAttribute('value').replace('.', '')),
                            width: Number(scaleData[i].getAttribute('width')),
                            height: Number(scaleData[i].getAttribute('height')),
                            cols: Number(scaleData[i].getAttribute('cols')),
                            rows: Number(scaleData[i].getAttribute('rows')),
                            tileHeight: Number(scaleData[i].getAttribute('tile_height')),
                            tileWidth: Number(scaleData[i].getAttribute('tile_width')),

                            resources: []
                        });
                        //pour chaque resources(angle de vue)
                        for (var j = 0; j < imgData.length; j++) {
                            Images.level[i].resources.push([]);

                            //pour chaque position(images découpées de l'angle de vue)
                            for (var k = 0; k < Images.level[i].cols * Images.level[i].rows; k++) {
                                var name = Images.url
                                    +'images/'+ imgData[j].getAttribute('name') 
                                    +'_'+ Images.level[i].value 
                                    +'_'+ k % Images.level[i].cols
                                    +'_'+ Math.floor(k / Images.level[i].cols) 
                                    +'.'+ Images.ext;

                                Images.level[i].resources[j].push({'loaded': false, 'img': name});
                            }
                        }
                    }
                }
                Images.nbAngle = Images.level[0].resources.length;
                console.log(Images.level[6]);
                $scope.init();
            });
        }
    };
}]);

ob.directive('tooltip', ['$sce', function ($sce) {
    return {
        restrict: 'E',
        require: '^orbitview',
        link: function ($scope, $elem, $attr, ov) {
            var tooltip = {
                title: $attr.titre,
                image: $attr.image,
                x: parseInt($attr.x),
                y: parseInt($attr.y),
                content: $sce.trustAsHtml($elem.html())
            };
            if (window.screen.width < 1024) {
                tooltip.x = parseInt($attr.mobilex);
                tooltip.y = parseInt($attr.mobiley);
            }
            ov.addTooltip(tooltip);
        }
    };
}]);


ob.directive('description', ['$sce', function ($sce) {
    return {
        restrict: 'E',
        require: '^orbitview',
        link: function ($scope, $elem, $attr, ov) {
            var description = {
                visible: false,
                title: $attr.titre,
                content: $sce.trustAsHtml($elem.html())
            };
            ov.addDescription(description);
        }
    };
}]);