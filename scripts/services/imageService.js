"use strict";
(function () {
  ob.factory("Images", ["$resource", "$location", "$rootScope", "$http", function ($resource, $location, $rootScope, $http) {
    return {
      //url: "../hyracotherium_pied-a-4-doigts/",
      //url: "../Axinite_prenite_epidote/",
      url: () => {
        //Si la paremetre url est renseigné
        if ($location.search().model) {
          return "../" + $location.search().model + "/"

        }
        //Sinon on charge l"amonite par défaut
        else return "../amonite/"
      },
      loadingQueue: [],
      loadSlot: 0,
      loaded: 0,
      firstLevelLoaded: 0,
      //charge un xml, contenu recuperable dans le .then
      loadxml: () => {
        return $http.get(this.url() + "content.xml");
      },

      loadDetails: () => {

        return $http.get(this.url() + "content2.xml");
      },
      loadLevel: (lvl) => {
        let time = new Date();
        //console.log("loadLevel  "+ lvl +" time: "+ time.getSeconds() +" "+ time.getMilliseconds());

        let scope = this.level[lvl];
        let f = false;
        for (let i = 0; i < scope.resources.length; i++) {
          this.loadResources(lvl, i, f);
        }
      },
      //loadResources avec queue, sans et avec slot
      loadResources: (lvl, angle, priority) => {
        priority = (typeof priority !== "undefined") ? priority : true;
        // console.log("prio "+ priority);
        if (priority) {
          for (let i = 0; i < this.level[lvl].resources[angle].length; i++)
            this.loadingQueue.unshift([lvl, angle, i]);
        } else {
          for (let i = 0; i < this.level[lvl].resources[angle].length; i++)
            this.loadingQueue.push([lvl, angle, i]);
        }
        this.loadQueuedImages();
      },
      //renvoie vrai si toutes les images inclus dans resources sont chargées
      resourcesLoaded: (lvl, agl) => {
        let angle = this.level[lvl].resources[agl];
        for (let i = 0; i < angle.length; i++) {
          if (!angle[i].loaded) return false;
        }
        return true;
      },

      //load sans queue
      loadImage: (lvl, angle, pos, fromQueue) => {
        fromQueue = fromQueue || false;
        let self = this.level[lvl].resources[angle][pos];
        let source = this.level[lvl].resources[angle][pos].img; //necessaire car cette info se perd si loadImage est executé plusieurs fois en parallèle
        // console.log("type: "+ (typeof source !== "string"));
        if (typeof source !== "string") {
          if (fromQueue) this.loadQueuedImages();
          return true;
        } else {
          let scope = this;
          let img = new Image();

          img.src = source;
          //console.log(img);
          scope.level[lvl].resources[angle][pos].img = img;
          scope.loadSlot++;
          $http.get(source, {
            method: "GET",
            cache: true
          }).then(() => {
            self.loaded = true;
            scope.loadSlot--;
            if (fromQueue) {
              // console.log("done "+ angle);
              scope.loadQueuedImages();
            }
            if (scope.firstLevelLoaded < scope.nbAngle && lvl == scope.level.length - 1) {
              scope.firstLevelLoaded++;
              // $rootScope.$emit("onFirstComplete");
              scope.loading(scope.firstLevelLoaded, scope.nbAngle);
            }
          });
          return false;
        }
      },
      //load avec queue à plusieurs slots
      loadQueuedImages: () => {
        if (this.loadSlot < 3 && this.loadingQueue.length > 0) {
          let current = this.loadingQueue.shift();
          if (this.loadImage(current[0], current[1], current[2], true)) {
          }
        }
      },
      //loading queue avec slot et sans slot
      loading: (current, max) => {
        // this.loaded += 1;
        let percent = current * 100 / max;
        percent = percent.toFixed(1);

        //A analyser pour comprendre pourquoi l"image n"est pas directement disponible au déclenchement de "onFirstComplete"
        if (percent >= 100) {
          $rootScope.$emit("onComplete");
        } else {
          $rootScope.$emit("onLoading", percent);
        }
      }
    };
  }]);
}())