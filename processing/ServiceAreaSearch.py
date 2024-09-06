import bisect
import time
from importlib import reload
import ProjectInteraction

from qgis.core import (QgsFeatureRequest,
                       QgsExpression,
                       QgsProject)
from qgis.PyQt import QtGui


class SearchStart:
    def __init__(self, identifier, layer, time, dictionary, is_transit_node, is_search_origin):
        self.id = identifier
        self.layer = layer
        self.time = time
        self.dictionary = dictionary
        self.is_transit_node = is_transit_node
        self.is_search_origin = is_search_origin

    def set_route_dir(self, rte, dir):
        self.rte = rte
        self.dir = dir

    def set_coord_string(self, coords):
        self.coord_string = coords

    def get_coord_string(self):
        if self.is_search_origin:
            return self.coord_string
        else:
            feature = next(self.layer.getFeatures(QgsFeatureRequest().setFilterFid(self.id)))
            geo_point = feature.geometry().asPoint()
            return f"{geo_point.x()},{geo_point.y()} [{self.layer.crs().authid()}]"

    def __repr__(self):
        mode = "transit" if self.is_transit_node else "walking"
        return f"id: {self.id}, mode: {mode}, time: {self.time},is_origin: {self.is_search_origin}"

    def __lt__(self, other):
        return self.time < other.time



class Search:
    def __init__(self, time_limit, context, feedback):
        self.time_limit = time_limit
        self.context = context
        self.feedback = feedback
        self.next_nodes = []
        self.walk_nodes_dictionary = {}
        self.transit_nodes_dictionary = {}
        self.repeat_search_threshold = 10
        self.repeat_count = 0
        self.walking_service_area = None
        self.transit_service_area = None


    def print_dictionary(self, dictionary):
        print("Dictionary:")
        for elem in dictionary:
            print(f"    {elem}")


    def print_search_list(self):
        print("Next/potential search nodes:")
        for elem in self.next_nodes[slice(10)]:
            print(f"    {elem}")
        print("    ... ")


    def print_search_summary(self):
        print(f"Searched from {len(self.walk_nodes_dictionary.keys())} walk nodes")
        print(f"Searched from {len(self.transit_nodes_dictionary.keys())} transit nodes")
        print(f"    Repeated searches from {self.repeat_count} nodes")


    def get_results(self, name):
        root = QgsProject.instance().layerTreeRoot()
        group = root.addGroup(name)

        if self.transit_service_area is not None:
            # Perform final dissolve if necessary
            if self.transit_service_area.featureCount() > 1:
                self.transit_service_area = ProjectInteraction.dissolve_layer(self.transit_service_area, self.context, self.feedback)
            ProjectInteraction.add_layer(self.transit_service_area, f"Transit network -  {name }", group)
        else:
            print("No transit service area found")

        if self.walking_service_area is not None:
            # Perform final dissolve if necessary
            if self.walking_service_area.featureCount() > 1:
                self.walking_service_area = ProjectInteraction.dissolve_layer(self.walking_service_area, self.context, self.feedback)
            ProjectInteraction.add_layer(self.walking_service_area, f"Street network -  {name }", group)
            self.create_polygon(group, name)
        else:
            print("No walking service area found")



    def create_polygon(self, group, name):
        polygon_layer = ProjectInteraction.polygonize(self.walking_service_area, self.context, self.feedback)
        renderer = polygon_layer.renderer()
        #print(renderer.type())
        symbol = renderer.symbol()
        symbol.setColor(QtGui.QColor(255,0,0,100))
        props = polygon_layer.renderer().symbol().symbolLayer(0).properties()
        #print(f"Properties: {props}")
        symbol.setOpacity(.4)
        ProjectInteraction.add_layer(polygon_layer, f"Blocks -  {name }", group)


    def should_add_search_node(self, key, dictionary, start_time):
        if key not in dictionary:
            return True

        time_remaining = self.time_limit - start_time
        prev_time_remaining = self.time_limit - dictionary[key]
        if time_remaining > prev_time_remaining * self.repeat_search_threshold:
            self.repeat_count += 1
            return True

        return False


    # Takes a path to a new node and adds it to correct list
    def add_search_node(self, feature, departing_time, add_to_walk_search, next_dictionary, next_layer):
        if departing_time >= self.time_limit:
            return
        feature_key = ProjectInteraction.get_correct_fid(feature, add_to_walk_search)

        if self.should_add_search_node(feature_key, next_dictionary, departing_time):
            next_dictionary[feature_key] = departing_time
            node = SearchStart(feature_key,
                               next_layer,
                               departing_time, next_dictionary, not add_to_walk_search, False)
            if not add_to_walk_search:
                node.set_route_dir(feature['rte'], feature['dir'])
            if self.next_nodes:
                bisect.insort(self.next_nodes, node)
            else:
                self.next_nodes.append(node)


    # Iterates over stops encountered in a search
    # If a stop has a cost associated with it (it could be reached), sends it off for saving
    def add_search_nodes(self, paths, node, add_to_walk_search):
        next_search_layer = ProjectInteraction.stops_layer if add_to_walk_search else ProjectInteraction.route_stops_layer
        next_dictionary = self.walk_nodes_dictionary if add_to_walk_search else self.transit_nodes_dictionary

        for f in paths:
            if f['cost']:
                if node.is_search_origin or add_to_walk_search:
                    departure_time = node.time + f['cost']
                else:
                    # Select the route that will depart from this stop
                    ProjectInteraction.select_by_route(ProjectInteraction.routes_layer, f['rte'], f['dir'], self.context, self.feedback)
                    if not ProjectInteraction.routes_layer.selectedFeatures():
                        continue
                    next_route = ProjectInteraction.routes_layer.selectedFeatures()[0]
                    if next_route['TRIPS_PER_HOUR'] == 0:
                        continue

                    # Average wait is half of the headway of the route
                    avg_wait = (1 / next_route['TRIPS_PER_HOUR']) / 2
                    departure_time = node.time + f['cost'] + avg_wait
                    ProjectInteraction.routes_layer.removeSelection()

                self.add_search_node(f, departure_time, add_to_walk_search, next_dictionary, next_search_layer)


    # Select next node from which to begin a search
    def pick_next(self):
        # If no more searchable nodes, return none
        if not self.next_nodes: return

        # Get next candidate by popping it from list
        node = self.next_nodes.pop(0)

        # Only begin a search if the node in the search list has the same time as it's dictionary match
        # Nodes may be entered multiple times if a faster start time is found
        # The dictionary entry will contain the fastest start time
        if node.time == node.dictionary[node.id]:
            return node

        return self.pick_next()


    def update_walking_dictionary(self, path_features, start_search_time):
        for f in path_features:
            cost = f['cost']

            feature_key = ProjectInteraction.get_correct_fid(f, True)
            if cost:
                if (feature_key not in self.walk_nodes_dictionary.keys() or
                        start_search_time + cost < self.walk_nodes_dictionary[feature_key]):
                    self.walk_nodes_dictionary[feature_key] = start_search_time + cost


    # Update the dictionary with the times a trip departed from each stop on route
    # Assume a sorted list of paths to each stop
    # Will also clean the paths layer to remove unreachable stops
    # And stops beyond another encountered, better, depart time
    def update_network_dictionary(self, path_features, start_search_time):
        met_better_departure = False
        for f in path_features:
            fid = f['fid']
            cost = f['cost']
            if cost and fid in self.transit_nodes_dictionary and self.transit_nodes_dictionary[fid] < start_search_time + cost:
                met_better_departure = True
            if not met_better_departure and cost:
                self.transit_nodes_dictionary[fid] = start_search_time + cost


    def perform_transit_search(self, node):
        paths_to_stops, self.transit_service_area = ProjectInteraction.get_reachable_stops_transit(node, self.time_limit, self.transit_service_area,
                                                                                self.context, self.feedback)
        path_features_sorted = ProjectInteraction.sort_paths_by_cost(paths_to_stops)
        #print(f"Sorted path features: {path_features_sorted} and len: {len(list(path_features_sorted))}")
        self.update_network_dictionary(path_features_sorted,node.time)
        self.add_search_nodes(paths_to_stops.getFeatures(), node, True)


    def perform_walk_search(self, node):
        paths_to_stops, self.walking_service_area = ProjectInteraction.get_reachable_stops_walking(node, self.time_limit, self.walking_service_area,
                                                                                self.context, self.feedback)
        path_features_sorted = ProjectInteraction.sort_paths_by_cost(paths_to_stops)
        self.update_walking_dictionary(paths_to_stops.getFeatures(), node.time)
        self.add_search_nodes(path_features_sorted, node, False)


    def perform_search(self):
        while self.next_nodes:
            next_origin = self.pick_next()
            if next_origin:
                #mode = "transit" if search_origin.is_transit_node else "walking"
                # print(f"Beginning {mode} search from point {next_origin.id}")

                if next_origin.is_transit_node:
                    self.perform_transit_search(next_origin)
                else:
                    self.perform_walk_search(next_origin)
            del next_origin
            if self.feedback.isCanceled():
                print("Cancelling search. Generating partial service layers.")

                return
        # print("Search complete")


    def init_search(self, origin_coords):
        # Prep starting node
        init_node = SearchStart(None, None, 0,
                                self.transit_nodes_dictionary, False, True)
        init_node.set_coord_string(origin_coords)

        # Prep node search list and dictionary
        self.next_nodes.append(init_node)
        init_node.dictionary[init_node.id] = init_node.time

        # Perform and time the search
        start_time = time.perf_counter()
        self.perform_search()
        end_time = time.perf_counter()
        print(f"Elapsed search time: {print_elapsed_time(end_time - start_time)}")





def print_elapsed_time(seconds):
    sec = seconds % (24 * 3600)
    hour = sec // 3600
    sec %= 3600
    min = sec // 60
    sec %= 60
    #print("seconds value in hours:", hour)
    #print("seconds value in minutes:", min)
    #return "%02d:%02d:%02d" % (hour, min, sec)
    return "%02d:%02d:%02d" % (hour, min, sec)


def main(name, origin_coords, search_time, context, feedback):
    s = Search(search_time, context, feedback)

    ProjectInteraction.pull_project_vars()
    ProjectInteraction.var_test()
    s.init_search(origin_coords)

    start_time = time.perf_counter()
    s.get_results(name)
    end_time = time.perf_counter()
    print(f"    + Elapsed time performing final dissolves: {print_elapsed_time(end_time - start_time)}")

    s.print_search_summary()

    del s


#main("7642303.8,681728.6 [EPSG:2913]", .5)