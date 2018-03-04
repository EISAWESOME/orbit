/* Sources dispo https://github.com/EISAWESOME/orbit */
"use strict";
const ob = angular.module("Orbit", [
  "ngMaterial",
  "ngResource",
  "ngAnimate",
  "hmGestures",
  "mousewheel",
  "ui.bootstrap"
]);

/**
 * TODO : 
 * -Service de dessin
 * -Service de point d'interet / sauvegarde XML - localstorage
 * -Faire des modules (Rollup?)
 * 
 * -Sass
 */
(function () {
  ob
    .config([
      "$mdThemingProvider",
      function ($mdThemingProvider) {
        $mdThemingProvider.theme("grey").primaryPalette("grey");
      }
    ])
    .controller("OrbitCtrl", [
      "$scope",
      "$rootScope",
      "Images",
      "storageService",
      "$mdDialog",
      "$mdSidenav",
      function ($scope, $rootScope, Images, storageService, $mdDialog, $mdSidenav) {

        $rootScope.$on("onLoading", function (event, percent) {
          $scope.loading = percent;
        });
        $rootScope.$on("onComplete", function () {
          const time = new Date();
          $scope.loading = false;
        });

        //Fonction executée a l'initialisation du scope
        $scope.init = function () {
          $scope.canvas = document.querySelector("#orbit-canvas");
          $scope.renderer = $scope.canvas.getContext("2d");

          $scope.level = Images.level.length - 1;
          Images.loadLevel($scope.level);

          window.onresize = $scope.resize;
          $scope.resize();
          $scope.visible = true;

          //Boucle de dessin, verifie si il faut dessiné toute les 40ms
          setInterval(function () {
            $scope.loadingReso = $scope.waitingload;

            $scope.draw();
          }, 40);

          Images.loadLevel($scope.level);

          // Transferer vers le storageService ?
          // Et retourner le titre et la description ?
          Images.loadxml().then(function (dataXML) {

            const ret = storageService.loadXml($scope.id, $scope.tooltips, $scope.angle, $scope.lookupAngle, dataXML);

            $scope.id = ret.id;
            $scope.titre = ret.titre;
            $scope.description = ret.description;
            $scope.details = ret.details;
          });

          $scope.modeCursor();
        };

        /**************Declaration et initialisation des variable du scope**************/
        //Initalisation de l'id des tooltip
        $scope.id = 0;
        //

        $scope.lookupAngle = {};
        $scope.translaY = 0;
        $scope.translaX = 0;

        $scope.prevDeltaX = 0;
        $scope.prevDeltaY = 0;

        $scope.pinIcon = new Image();
        $scope.pinIcon.src = "./resources/icons/pinIcon-32x32.png";

        //Theme des dialog et de la navbar
        $scope.theme = "grey";
        //

        //Variables lié aux modes
        $scope.clickRotation = true;
        $scope.clickTranslation = false;
        $scope.pinMode = false;
        $scope.autoPlay = false;
        $scope.isEditMode = false;
        $scope.isFullscreen = false;
        $scope.fsSrc = "./resources/icons/icon_fullscreen.png";
        $scope.currentCursor = "default";
        //

        //Variables lié au tooltips
        $scope.tooltips = [];
        $scope.tooltip = null;
        $scope.tooltipTrueCoord = {};
        $scope.tooltipTitre = "";
        $scope.tooltipDesc = "";
        $scope.isPopDrawn = false;
        //

        //Variable lié au chargement des images
        $scope.loading = "0";
        $scope.loadingReso = false;
        $scope.waitingload = true;
        $scope.visible = false;
        //

        //Variables lié au dessin
        $scope.zoom = 1; //1 = zoom à 100%
        $scope.level = 0;
        $scope.angle = 0; //id de l'angle de vue
        $scope.posX = 0;
        $scope.posY = 0;
        $scope.actualTileWidth = 0;
        $scope.actualTileHeight = 0;
        //

        //Initialisation de l'etat de la navbar, des descriptions dans le menu, et de la description du titre
        $scope.isNavCollapsed = true;
        $scope.isCollapsed = true;
        $scope.isTitreCollapsed = true;

        /****************************************************************************/

        /****************************Dessin de l'objet**************************/
        $scope.draw = function () {
          if (
            ($scope.waitingload &&
              Images.resourcesLoaded($scope.level, $scope.angle)) ||
            $scope.edited
          ) {
            $scope.waitingload = false;
            //Permet de reinitialisé le canvas
            $scope.canvas.width = $scope.canvas.width;

            //On replace l'origine du canvas a l'endroit ou on l'avais laisser
            $scope.renderer.translate($scope.translaX, $scope.translaY);
            $scope.renderer.save();

            let lvl = $scope.level;
            let current = Images.level[lvl].resources[$scope.angle];
            //Si les images de l'angle ne sont pas chargé, on attend et on les recharge
            if (!Images.resourcesLoaded(lvl, $scope.angle)) {
              $scope.waitingload = true;
              Images.loadResources(lvl, $scope.angle);

              while (
                lvl < Images.level.length - 1 &&
                !Images.resourcesLoaded(lvl, $scope.angle)
              ) {
                lvl++;
              }
              current = Images.level[lvl].resources[$scope.angle];
              //Image(s) courante, de 1 à 12 (index 0 à 11 ...)
              //Le nombre d'image varie en fonction du level
            }
            const ILvl = Images.level[lvl],
              posOriX = $scope.getX(),
              posOriY = $scope.getY(),
              lapX =
              Math.floor(Images.level[0].width / ILvl.cols) * $scope.zoom,
              lapY =
              Math.floor(Images.level[0].height / ILvl.rows) * $scope.zoom;

            //Pour chaque images du niveau
            for (let i = 0; i < current.length; i++) {
              $scope.posX = posOriX + lapX * Math.floor(i / ILvl.rows);
              $scope.posY = posOriY + lapY * Math.floor(i % ILvl.rows);

              //le +1 permet de supprimé l'écart entre les 4 images sous Firefox et IE, leger clipping sur chrome
              $scope.actualTileWidth =
                current[i].img.naturalWidth * $scope.zoom * 1000 / ILvl.value +
                1;
              $scope.actualTileHeight =
                current[i].img.naturalHeight * $scope.zoom * 1000 / ILvl.value +
                1;

              //On dessine l'image dans sa "case"
              $scope.renderer.drawImage(
                current[i].img,
                $scope.posX,
                $scope.posY,
                $scope.actualTileWidth,
                $scope.actualTileHeight
              );
            }
            //Une fois que toute les cases sont dessinées, on dessine les points d'interet
            if ($scope.xml) {
              const points = $scope.xml.getElementsByTagName("PointInteret");
              for (let j = 0; j < points.length; j++) {
                //Si il existe un ou plusieurs point d'interet sur cet angle
                if (points[j].getAttribute("Angle") == $scope.angle) {
                  //On recup les coords du point d'interet sur scale 100%
                  const pinCoord = points[j].getElementsByTagName("Coord"),
                    pinX = Number(pinCoord[0].getAttribute("x")),
                    pinY = Number(pinCoord[0].getAttribute("y"));

                  //On applique le ratio pour avoir ses coord sur la scale courante
                  const drawX = pinX * $scope.zoom,
                    drawY = pinY * $scope.zoom;

                  //Et on defini le centre du dessin comme l'origine
                  const centerX = $scope.canvas.clientWidth / 2 + drawX,
                    centerY = $scope.canvas.clientHeight / 2 + drawY;

                  //On attend que l'image soit chargé, puis on la dessine
                  $scope.renderer.drawImage(
                    $scope.pinIcon,
                    centerX - 16,
                    centerY - 32
                  );
                }
              }
              $scope.edited = false;
            }
          }
        };

        $scope.getX = function () {
          return +(
            $scope.canvas.width / 2 -
            Images.level[0].width / 2 * $scope.zoom
          ).toFixed(0);
        };
        $scope.getY = function () {
          return -(
            (Images.level[0].height * $scope.zoom - $scope.canvas.height) /
            2
          ).toFixed(0);
        };
        $scope.resize = function () {
          $scope.resetTransla();
          $scope.renderer.restore();
          $scope.canvas.width = $scope.canvas.offsetWidth;
          $scope.canvas.height = $scope.canvas.offsetHeight;
          if ($scope.loading === true) {
            return false;
          }
          if (
            $scope.canvas.width / Images.level[0].width <=
            $scope.canvas.height / Images.level[0].height
          ) {
            $scope.zoom = $scope.canvas.width / Images.level[0].width;
          } else {
            $scope.zoom = $scope.canvas.height / Images.level[0].height;
          }
          $scope.level = Images.level.length - 1;
          while ($scope.zoom * 1000 > Images.level[$scope.level].value) {
            $scope.level--;
          }
          $scope.minZoom = $scope.zoom;
          $scope.maxZoom = 1;
          if ($scope.visible) {
            $scope.$apply();
          }
          $scope.edited = true;
        };
        /*************************************************************************/

        /*******************Fonctions de deplacement*******************************/
        //Fonction de changement grab/grabbing
        $scope.toggleGrab = function () {
          if (!$scope.pinMode) {
            if (
              $scope.canvas.style.cursor == "-webkit-grab" ||
              $scope.canvas.style.cursor == "-moz-grab" ||
              $scope.canvas.style.cursor == "grab"
            ) {
              $scope.canvas.style.cursor = "-webkit-grabbing";
              $scope.canvas.style.cursor = "-moz-grabbing";
              $scope.canvas.style.cursor = "grabbing";
            } else {
              $scope.canvas.style.cursor = "-webkit-grab";
              $scope.canvas.style.cursor = "-moz-grab";
              $scope.canvas.style.cursor = "grab";
            }
          }
        };

        $scope.dragStart = function () {
          if ($scope.clickRotation && !$scope.clickTranslation) {
            $scope.toggleGrab();
          }
        };

        //Gestion du drag
        $scope.drag = function (e) {
          if (!$scope.loading) {
            //Si on est en mode Rotation
            if ($scope.clickRotation && !$scope.clickTranslation) {
              let dst = $scope.lastDrag - e.gesture.deltaX,
                ratio;

              dst *= 1;
              ratio = dst / 10;
              ratio = ratio.toFixed(0);
              if (ratio === "-0") {
                ratio = -1;
              } else if (ratio === "0") {
                ratio = 1;
              }
              $scope.lastDrag = e.gesture.deltaX;
              $scope.setAngle($scope.angle + parseInt(ratio));
            }

            //Si on est en mode translation
            if ($scope.clickTranslation && !$scope.clickRotation) {
              const deplacementX = e.gesture.deltaX - $scope.prevDeltaX,
                deplacementY = e.gesture.deltaY - $scope.prevDeltaY;

              $scope.incrTranslaX(deplacementX);
              $scope.incrTranslaY(deplacementY);

              $scope.prevDeltaX = e.gesture.deltaX;
              $scope.prevDeltaY = e.gesture.deltaY;
              $scope.edited = true;
            }
          }
        };

        $scope.dragEnd = function () {
          if ($scope.clickRotation && !$scope.clickTranslation) {
            $scope.toggleGrab();
          }
          $scope.prevDeltaX = 0;
          $scope.prevDeltaY = 0;
        };

        //Fonction qui permet la rotation jusqu'a un angle donné
        $scope.goTo = function (angle) {
          if ($scope.angle != angle) {
            if (
              Images.nbAngle - angle + $scope.origAngle <
              angle - $scope.origAngle
            ) {
              $scope.setAngle($scope.angle - 1);
            } else $scope.setAngle($scope.angle + 1);

            window.setTimeout($scope.goTo, 5, angle);
          } else {
            if (document.querySelector(".titrePop"))
              document.querySelector(".titrePop").style.display = "block";
          }
        };
        //A la fin du drag, on reset les valeurs

        //Gestion des event de touche du clavier
        $scope.keymove = function (e) {
          if (!$scope.loading) {
            //Les controle avec les fleches ne sont active que quant le menu est fermé
            if ($scope.isNavCollapsed) {
              //Mode Rotation
              if ($scope.clickRotation && !$scope.clickTranslation) {
                if (e.keyCode === 39) $scope.setAngle($scope.angle - 1);

                if (e.keyCode === 37) $scope.setAngle($scope.angle + 1);
              }
              //Mode Translation
              if ($scope.clickTranslation && !$scope.clickRotation) {
                $scope.renderer.restore();
                $scope.renderer.save();

                if (e.keyCode === 37)
                  // Gauche
                  $scope.incrTranslaX(-10);

                if (e.keyCode === 38)
                  // Haut
                  $scope.incrTranslaY(-10);

                if (e.keyCode === 39)
                  // Droite
                  $scope.incrTranslaX(10);

                if (e.keyCode === 40)
                  // Bas
                  $scope.incrTranslaY(10);

                $scope.edited = true;
              }
            }
          }
        };

        //Fonctions d'incrémentation de la translation du canvas
        $scope.incrTranslaX = function (translaX) {
          $scope.translaX += translaX;
        };
        $scope.incrTranslaY = function (translaY) {
          $scope.translaY += translaY;
        };

        $scope.setAngle = function (angle) {
          if (angle >= Images.nbAngle) $scope.angle = angle - Images.nbAngle;
          else if (angle < 0) $scope.angle = angle + Images.nbAngle;
          else $scope.angle = angle;
          if ($scope.lookupAngle[$scope.angle]) {
            displayDesc();
          }

          $scope.edited = true;
        };

        //Fonction de definition de la translation du canvas
        $scope.setTranslaXY = function (translaX, translaY) {
          $scope.translaX = translaX;
          $scope.translaY = translaY;
          $scope.edited = true;
        };

        $scope.resetTransla = function () {
          $scope.translaY = 0;
          $scope.translaX = 0;
          $scope.edited = true;
        };
        /*************************************************************************/

        /***************************Controles de l'application********************/
        //Permet la rotation automatique du modele
        $scope.play = function () {
          if ($scope.autoPlay) {
            $scope.setAngle($scope.angle + 1);
            window.setTimeout($scope.play, 40);
          }
        };

        //Plein écran
        $scope.toggleFullscreen = function () {
          const elem = document.querySelector("html");
          if ($scope.isFullscreen) {
            $scope.fsSrc = "./resources/icons/icon_fullscreen_back.png";
            if (elem.requestFullscreen) {
              elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
              elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
              elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
              elem.webkitRequestFullscreen();
            }
          } else {
            $scope.fsSrc = "./resources/icons/icon_fullscreen.png";
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
              document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
          }
        };

        $scope.onWheel = function (e) {
          $scope.renderer.restore();
          const zoom = $scope.zoom;
          if (e.deltaY > 0) {
            $scope.zoomOut();
          } else {
            $scope.zoomIn();
          }
          if (zoom != $scope.zoom) $scope.edited = true;
        };

        $scope.zoomOut = function () {
          $scope.zoom -= 0.1;
          if ($scope.zoom < $scope.minZoom) {
            $scope.zoom = $scope.minZoom;
          }
          if (
            $scope.level < Images.level.length - 1 &&
            $scope.zoom * 1000 <= Images.level[$scope.level + 1].value
          )
            $scope.level++;
          $scope.edited = true;
        };

        $scope.zoomIn = function () {
          $scope.zoom += 0.1;
          if ($scope.zoom >= $scope.maxZoom) {
            $scope.zoom = $scope.maxZoom;
          }
          if (
            $scope.level > 0 &&
            $scope.zoom * 1000 > Images.level[$scope.level].value
          )
            $scope.level--;
          $scope.edited = true;
        };

        //Toggle du mode edition
        $scope.editMode = function () {
          $scope.isEditMode = !$scope.isEditMode;
          //Desactive le pinmode en meme temps que la modification
          if ($scope.isEditMode === false) {
            $scope.pinMode = false;
          }
        };

        //Passe de rotation à translation
        $scope.modeCursor = function () {
          if ($scope.pinMode) {
            $scope.canvas.style.cursor = "crosshair";
            $scope.currentCursor = "crosshair";
          } else {
            if ($scope.clickRotation && !$scope.clickTranslation) {
              $scope.canvas.style.cursor = "-webkit-grab";
              $scope.canvas.style.cursor = "-moz-grab";
              $scope.canvas.style.cursor = "grab";
              $scope.currentCursor = "grab";
            }

            if ($scope.clickTranslation && !$scope.clickRotation)
              $scope.canvas.style.cursor = "move";
            $scope.currentCursor = "move";
          }
        };
        $scope.switchMode = function () {
          $scope.clickRotation = !$scope.clickRotation;
          $scope.clickTranslation = !$scope.clickTranslation;

          $scope.modeCursor();
        };

        $scope.exportXML = function(){
          storageService.exportXML();
        }

        /*************************************************************************/

        /********************Fonctions de gestion du pin ***************************/
        //Création d'un point d'interet au clic
        $scope.pin = function (e) {
          if ($scope.pinMode) {
            if (!$scope.isNavCollapsed) $scope.toggleLeft();
            let lvl = $scope.level;
            // Place l'origine de X et de Y au centre de l'image, prennant en compte la translation du canvas
            const cursorX =
              e.gesture.center.pageX -
              $scope.canvas.clientWidth / 2 -
              $scope.translaX,
              cursorY =
              e.gesture.center.pageY -
              $scope.canvas.clientHeight / 2 -
              $scope.translaY;

            //On etablie le ratio de proportion entre l'image scale 100% et l'image affiché à l'écran
            const ratioX =
              Images.level[0].width /
              ($scope.actualTileWidth * Images.level[lvl].cols),
              ratioY =
              Images.level[0].height /
              ($scope.actualTileHeight * Images.level[lvl].rows);

            //Les coordonnées du point à l'echelle 1:1 de l'image d'origine scale 100%
            $scope.tooltipTrueCoord = {
              x: cursorX * ratioX,
              y: cursorY * ratioY
            };

            //On vérifie que la curseur soit dans la zone de dessin pour crée le point d'interet
            if (!(
                cursorX > $scope.actualTileWidth * Images.level[lvl].cols / 2 ||
                cursorX <
                -$scope.actualTileWidth * Images.level[lvl].cols / 2 ||
                cursorY >
                $scope.actualTileHeight * Images.level[lvl].rows / 2 ||
                cursorY < -$scope.actualTileHeight * Images.level[lvl].rows / 2
              )) {
              $scope.promptPoint();
            }
          }
        };

        //Creation de l'objet correspondant au point
        $scope.createTooltip = function () {
          const id = $scope.id;
          $scope.id++;

          const title = $scope.tooltipTitre;
          const desc = $scope.tooltipDesc;

          storageService.writePin(
            title,
            desc,
            $scope.angle,
            $scope.tooltipTrueCoord,
            id
          );

          const tooltip = {
            title: title,
            desc: desc,
            image: $scope.angle, //Angle
            x: $scope.tooltipTrueCoord.x,
            y: $scope.tooltipTrueCoord.y,
            id: id
          };

          $scope.tooltips.push(tooltip);

          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            $scope.lookupAngle[$scope.tooltips[i].image] = $scope.tooltips[i];
          }

          //Actualise la detection pour le nouveau point
          if ($scope.lookupAngle[$scope.angle]) {
            displayDesc();
          }

          $scope.edited = true;
        };

        //Fonction de suppression d'un point d'interet
        $scope.deletePoint = function (e) {
          const lookup = {};
          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            lookup[$scope.tooltips[i].id] = $scope.tooltips[i];
          }

          const ttId = e.target.parentNode.parentNode.parentNode.id;

          $scope.tooltip = lookup[ttId];
          $scope.tooltip.id = ttId;

          //Remove dans le tooltip

          let a = e.target;
          const els = [];
          while (a) {
            els.unshift(a);
            a = a.parentNode;
          }
          els[7].remove();
          const indextt = $scope.tooltips.indexOf($scope.tooltip);
          $scope.tooltips.splice(indextt, 1);

          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            $scope.lookupAngle[$scope.tooltips[i].image] = $scope.tooltips[i];
          }

          //Remove dans le XML
          storageService.deletePin($scope.tooltip);
          $scope.edited = true;
        };

        $scope.toggleEditTooltip = function (e) {
          const lookup = {};
          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            lookup[$scope.tooltips[i].id] = $scope.tooltips[i];
          }

          const ttId = e.target.parentNode.parentNode.parentNode.id;

          $scope.tooltip = lookup[ttId];
          $scope.tooltip.id = ttId;

          //Rend le titre du tooltip editable ou pas
          const ligneTitre =
            e.target.parentNode.parentNode.parentNode.childNodes[1],
            tdTitre = ligneTitre.childNodes[3],
            ligneDesc = e.target.parentNode.parentNode.parentNode.childNodes[3],
            divDesc = ligneDesc.childNodes[1].childNodes[1].childNodes[1];

          if (tdTitre.contentEditable == "true") {
            tdTitre.setAttribute("contenteditable", "false");
            storageService.updatePin(ttId, "titre", "", tdTitre.textContent, $scope.tooltip);
          } else tdTitre.setAttribute("contenteditable", "true");

          //Rend la description du tooltip editable ou pas
          if (divDesc.contentEditable == "true") {
            divDesc.setAttribute("contenteditable", "false");
            storageService.updatePin(ttId, "desc", divDesc.textContent, "", $scope.tooltip);
          } else divDesc.setAttribute("contenteditable", "true");
        };

        /***************************************************************************/

        /************************ Fonctions d'affichage des pop *******************/
        //Cree un element pop (desc ou titre)
        $scope.pointPop = function (mode, popContent, pointX, pointY) {
          if (!$scope.isPopDrawn) {
            const popContainer = document.createElement("div"),
              popText = document.createTextNode(popContent);

            let a = document.querySelector("orbitview");
            popContainer.appendChild(popText);
            popContainer.style.marginLeft = pointX + "px";
            popContainer.style.marginTop = pointY + "px";
            popContainer.className = mode + "Pop";
            a.appendChild(popContainer);
            $scope.isPopDrawn = true;
          }
        };

        //Supprime tout les elements pop
        $scope.deleteAllPop = function () {
          let a = document.querySelector("orbitview"),
            b = document.querySelector(".titrePop"),
            c = document.querySelector(".descPop");
          if (b) {
            a.removeChild(b);
          }
          if (c) {
            a.removeChild(c);
          }
          $scope.isPopDrawn = false;
        };

        //Supprime les element titrePop
        $scope.deleteTitrePop = function () {
          let a = document.querySelector("orbitview"),
            b = document.querySelector(".titrePop");
          if (b) {
            a.removeChild(b);
          }
        };

        //Affiche le description du point quand on passe la souris dessus
        function displayDesc() {
          //Retourne un tableau contenant tout les points de l'angle courant
          const matchedTt = $scope.tooltips.filter(matchAngle);

          function matchAngle(element) {
            return element.image == $scope.angle;
          }

          $scope.canvas.addEventListener("mousemove", function (e) {
            let lvl = $scope.level;

            let aX = e.pageX - $scope.canvas.clientWidth / 2 - $scope.translaX,
              aY = e.pageY - $scope.canvas.clientHeight / 2 - $scope.translaY;

            const ratioX =
              Images.level[0].width /
              ($scope.actualTileWidth * Images.level[lvl].cols),
              ratioY =
              Images.level[0].height /
              ($scope.actualTileHeight * Images.level[lvl].rows);

            const cursorX = aX * ratioX,
              cursorY = aY * ratioY;

            let incr = 0;
            //On boucle dans le tableau des point interet de l'angle actuel
            for (let i = 0; i < matchedTt.length; i++) {
              const pointX =
                matchedTt[i].x / ratioX +
                $scope.translaX +
                $scope.canvas.clientWidth / 2,
                pointY =
                matchedTt[i].y / ratioY +
                $scope.translaY +
                $scope.canvas.clientHeight / 2;

              //Les offsets entrée sont arbitraires et correspondent a la tolerence de declenchement de l'affichage du tooltip
              //On divise par le zoom pour que la tolérence diminue plus le zoom est elevé, et inversement

              //Si la position du curseur correspond a celle d'un point
              if (matchedTt[i].image == $scope.angle) {
                if (
                  cursorX >= Number(matchedTt[i].x) - 10 / $scope.zoom &&
                  cursorX <= Number(matchedTt[i].x) + 10 / $scope.zoom
                ) {
                  if (
                    cursorY >= Number(matchedTt[i].y) - 40 / $scope.zoom &&
                    cursorY <= Number(matchedTt[i].y) + 10 / $scope.zoom
                  ) {
                    //On supprime le pop up précedent si il existe
                    $scope.deleteTitrePop();
                    //On crée le pop up du point en question
                    $scope.pointPop("desc", matchedTt[i].desc, pointX, pointY);
                    $scope.canvas.style.cursor = "default";
                  } else {
                    incr++;
                  }
                } else {
                  incr++;
                }
                if (incr === matchedTt.length) {
                  let a = document.querySelector("orbitview");
                  const b = a.querySelector(".descPop");
                  if (b) {
                    a.removeChild(b);
                    $scope.canvas.style.cursor = $scope.currentCursor;
                  }
                  $scope.isPopDrawn = false;
                }
              }
            }
          });
        }

        //Effectue un goto jusqu'au point clické, crée et affiche un pop de son titre
        $scope.clickTooltip = function (e) {
          $scope.deleteAllPop();
          //On crée un lookup qui associe l'id d'un tooltip a son objet
          const lookup = {};
          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            lookup[$scope.tooltips[i].id] = $scope.tooltips[i];
          }
          //On recupere l'id qui correspond au tooltip clické
          const ttId = e.target.parentNode.parentNode.id;
          $scope.tooltip = lookup[ttId];
          $scope.tooltip.id = ttId;
          $scope.autoPlay = false;

          const ratioX =
            Images.level[0].width /
            ($scope.actualTileWidth * Images.level[$scope.level].cols),
            ratioY =
            Images.level[0].height /
            ($scope.actualTileHeight * Images.level[$scope.level].rows);

          const pointX =
            $scope.tooltip.x / ratioX +
            $scope.translaX +
            $scope.canvas.clientWidth / 2,
            pointY =
            $scope.tooltip.y / ratioY +
            $scope.translaY +
            $scope.canvas.clientHeight / 2;

          $scope.pointPop("titre", $scope.tooltip.title, pointX, pointY);
          $scope.origAngle = $scope.angle;
          $scope.goTo($scope.tooltip.image);
        };

        //Affiche la description du point au survol de ce dernier dans le menu
        //Seulement si on est deja sur son angle
        $scope.hoverTooltip = function (e) {
          const lookup = {};
          for (let i = 0, len = $scope.tooltips.length; i < len; i++) {
            lookup[$scope.tooltips[i].id] = $scope.tooltips[i];
          }

          const ttId = e.target.parentNode.parentNode.id;
          $scope.tooltip = lookup[ttId];
          $scope.tooltip.id = ttId;
          $scope.autoPlay = false;

          if ($scope.tooltip.image == $scope.angle) {
            $scope.deleteAllPop();

            const ratioX =
              Images.level[0].width /
              ($scope.actualTileWidth * Images.level[$scope.level].cols),
              ratioY =
              Images.level[0].height /
              ($scope.actualTileHeight * Images.level[$scope.level].rows);

            const pointX =
              $scope.tooltip.x / ratioX +
              $scope.translaX +
              $scope.canvas.clientWidth / 2,
              pointY =
              $scope.tooltip.y / ratioY +
              $scope.translaY +
              $scope.canvas.clientHeight / 2;

            $scope.pointPop("titre", $scope.tooltip.title, pointX, pointY);
            if (document.querySelector(".titrePop"))
              document.querySelector(".titrePop").style.display = "block";
          }
        };
        /****************************************************************************/

        /***************** Fonction de toggle du Sidenav (menu vertical)************/
        $scope.toggleLeft = buildToggler("left");
        $scope.toggleRight = buildToggler("right");

        function buildToggler(componentId) {
          return function () {
            $mdSidenav(componentId).toggle();
            $scope.isNavCollapsed = !$scope.isNavCollapsed;
          };
        }
        /**************************************************************************/

        /********************************Dialogs**********************************/
        //Dialog de confirmation de la suppression
        $scope.confirmDelete = function (ev, id) {
          // Appending dialog to document.body to cover sidenav in docs app
          const confirm = $mdDialog
            .confirm()
            .theme("grey")
            .title("Supprimer ce point d'interet ?")
            .textContent("Vous ne pourrez pas revenir en arrière...")
            .ariaLabel("Suppression")
            .targetEvent(ev)
            .ok("Supprimer")
            .cancel("Annuler");

          $mdDialog.show(confirm).then(function () {
            $scope.deletePoint(ev, id);
          });
        };

        //Dialog de saisie du Titre et Desc d'un point
        $scope.promptPoint = function (ev) {
          $mdDialog
            .show({
              templateUrl: "views/tooltipPrompt.tpl.html",
              parent: angular.element(document.body),
              targetEvent: ev,
              controller: "OrbitCtrl",
              clickOutsideToClose: true,
              escapeToClose: true
            })
            .then(function (answer) {
              $scope.tooltipTitre = answer.Titre;
              $scope.tooltipDesc = answer.Desc;
              $scope.createTooltip();
            });
        };
        
        $scope.envoyer = function (answer) {
          $mdDialog.hide(answer);
        };
        $scope.closeDialog = function () {
          $mdDialog.cancel();
        };
        /***************************************************************************/
      }
    ]);
})();