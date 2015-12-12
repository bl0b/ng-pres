(function() {


var app = angular.module('ngPres', [])
.run(function($templateCache) {
    $templateCache
        .put("toc-item.html",
             `{{item.title}}
             <div class="slide-bullets">
                 <span ng-class="['slide-bullet', {'slide-bullet-active': s == $parent.current_slide}]"
                       ng-repeat="s in item.slides">{{s == $parent.current_slide ? slideBulletActive : slideBullet}}</span>
             </div>
             <ul class="toc" ng-if="item.children.length > 0">
                 <li ng-class="['toc-item', {'current-toc-item': item.slides.indexOf($parent.current_slide) != -1}]"
                     ng-repeat="item in item.children">
                     <ng-include src="'toc-item.html'"></ng-include>
                 </li>
             </ul>
            `);
    $templateCache
        .put("presentation.html",
             `<table class="presentation">
                  <tr><td class="header" colspan="3" ng-transclude="header"></td></tr>
                  <tr>
                      <td class="left-sidebar" ng-transclude="leftSidebar"></td>
                      <td class="slide" ng-transclude></td>
                      <td class="right-sidebar" ng-transclude="rightSidebar"></td>
                  </tr>
                  <tr><td class="footer" colspan="3" ng-transclude="footer"></td></tr>
              </table>
             `);
})
.directive('presentation', ['$document', '$rootScope', function($document, $rootScope) {
    return {
        restrict: 'E',
        transclude: {
            'header': '?header',
            'leftSidebar': '?leftSidebar',
            'rightSidebar': '?rightSidebar',
            'footer': '?footer'
        },
        templateUrl: "presentation.html", //'<div class="presentation"><ng-transclude></ng-transclude></div>',
        link: function(scope, element, attr) {
            console.log('setting up keydown event callback');
            $document.bind('keydown', function(e) {
                /*console.log('Got keydown:', e.keyCode);*/
                $rootScope.$broadcast('keydown', e);
                $rootScope.$broadcast('keydown:' + e.keyCode, e);
                /*scope.$digest();*/
                
            });
        },
        /*link: {*/
            /*pre: function(scope, element, attr, controller) {*/
                /*scope.tocHilight = attr.tocHilight;*/
            /*}*/
        /*},*/
        controller: ['$scope', '$document', '$element', function($scope, $document, $element) {
            console.log($element);
            attr = $element[0].attributes;
            $scope.tocHilight = attr['toc-hilight'].value;
            $scope.slideBullet = attr['slide-bullet'].value;
            $scope.slideBulletActive = attr['slide-bullet-active'].value;
            $scope.current_slide = 0;
            $scope.slide_count = 0;
            $scope.TOC = {title:'', slides: [], children: []};

            $scope.next_slide = function() {
                if ($scope.current_slide < ($scope.slide_count - 1)) {
                    /*console.log('next slide!');*/
                    $scope.current_slide += 1;
                }
            };

            $scope.previous_slide = function() {
                if ($scope.current_slide > 0) {
                    /*console.log('previous slide!');*/
                    $scope.current_slide -= 1;
                }
            };
            
            $scope.$on('keydown:37', function(onEvent, keypressEvent) {
                $scope.$apply($scope.previous_slide());
            });
            $scope.$on('keydown:39', function(onEvent, keypressEvent) {
                $scope.$apply($scope.next_slide());
            });
            this.current_slide = function() { return $scope.current_slide; };

            this.slide_count = function() { return $scope.slide_count; };

            this.section_stack = [$scope.TOC];

            this.current_section = function() { return this.section_stack[this.section_stack.length - 1]; };

            this.enter_section = function(title) {
                /*console.log("enter section " + title);*/
                var section = {title: title, slides: [], children: []};
                this.current_section().children.push(section);
                this.section_stack.push(section);
            };

            this.leave_section = function() {
                /*console.log("leave section " + this.current_section().title);*/
                this.section_stack.pop();
            };
            
            this.add_slide = function() {
                var ret = $scope.slide_count;
                $scope.slide_count += 1;
                this.current_section().slides.push(ret);
                return ret;
            };

            this.get_toc = function() { /*console.log('get_toc'); console.log($scope.TOC);*/ return $scope.TOC; };
            console.log($scope);
        }]
    };
}])
.directive('renderToc', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: true,
        link: function(scope, element, attr, presentation) {
            scope.currentClass = attr.currentClass;
        },
        template: '<div ng-repeat="item in [$parent.TOC]" ng-include="\'toc-item.html\'"></div>'
    };
})
.directive('enterSection', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: {title:"@"},
        link: function(scope, element, attr, presentation) {
            /*console.log(attr);*/
            /*console.log(scope);*/
            presentation.enter_section(attr.title);
        },
        template: ''
    };
})
.directive('leaveSection', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        link: function(scope, element, attr, presentation) {
            presentation.leave_section();
        },
        template: ''
    };
})
.directive('section', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {title:"@"},
        template: '<enter-section title="{{title}}"></enter-section><ng-transclude></ng-transclude><leave-section></leave-section>',
    };
})
.directive('slide', function() {
    return {
        restrict: 'E',
        transclude: true,
        require: '^presentation',
        scope: {},
        link: function(scope, element, attr, presentation) {
            scope.slide_index = presentation.add_slide();
        },
        template: '<div class="slide" ng-if="slide_index == $parent.current_slide"><ng-transclude></ng-transclude></div>'
    };
})
.directive('progressBar', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        template: '<div class="progress-bar"><div class="progress-bar-inner" style="width: {{100 * ($parent.current_slide + 1) / $parent.slide_count}}%;"></div></div>'
    };
})
.directive('block', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {title: '@'},
        template: `
            <div class="block">
                <div class="block-title"><h1>{{title}}</h1></div>
                <div class="block-content" ng-transclude></div>
            </div>
        `
    };
})
.directive('slideCounter', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        template: '<p class="slide-counter">{{$parent.current_slide + 1}}&nbsp;/&nbsp;{{$parent.slide_count}}</p>'
    };
})
;
})()
