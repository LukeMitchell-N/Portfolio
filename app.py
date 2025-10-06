from ctypes import sizeof
import time
from flask import   (Flask, jsonify, 
                    render_template, 
                    request,
                    Response,
                    send_from_directory, stream_with_context)
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired
import sys,             \
    uuid,               \
    subprocess,         \
    queue,              \
    threading
sys.path.append('processing/TransitIsochroneTool')
feedback_queues = {}

app = Flask(__name__)

def run_app():
    app.run(debug=True, host="0.0.0.0", port=5000)


@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('home.html', title="Home", active_page="home")

@app.route('/transit_isochrone', methods=['GET'])
def transit_iso():
    return render_template('transit_isochrone.html', title="Portland Transit Isochrone", active_page="transit_isochrone")

@app.route('/nca_map', methods=['GET'])
def nca_map():
    return render_template('nca_map.html', title="Neighbors for Clean Air Map")

@app.route('/gis_II_portfolio', methods=['GET'])
def gis_ii_portfolio():
    return render_template('GIS_II_portfolio.html', title="GIS II Portfolio")

@app.route('/transit_connectivity', methods=['GET'])
def transit_connectivity():
    return render_template('transit_connectivity.html', title="Portland Transit Connectivity", active_page = "transit_connectivity")

def enqueue_output(process, queue):
    for line in process.stdout:
        queue.put(line.rstrip())
    queue.put("DONE")


@app.route("/run_isochrone_tool", methods=['POST'])
def run_iso():

    
    lat = request.form['lat']
    lon = request.form['lon']
    x = request.form['x']
    y = request.form['y']
    crs = request.form['crs']
    time_constraint = request.form['time']
    '''
    print(f"Lat :{lat}")
    print(f"Y :{y}")
    print(f"Lon :{lon}")
    print(f"X :{x}")
    print(f"Crs :{crs}")
    print(f"Time constraint :{time_constraint}")
    '''

    start_loc = x.__str__() + ',' + y.__str__() + f' [{crs}]'

    print("Starting isochrone search...")            
    process = subprocess.Popen(                                             # Run the geoprocessing script as a separate task
                    args =["python3", 
                        "-u", 
                        "./processing/TransitIsochroneTool/ExecSearch.py", 
                        start_loc, 
                        time_constraint],
                    stdout=subprocess.PIPE,                                 
                    stderr=subprocess.PIPE,
                    text=True)

    process_id = str(uuid.uuid4())                                          # Generate a unique ID for the process
    new_queue = queue.Queue()                                               # Create a queue for the piped output from the geoprocessing script
    feedback_queues[process_id] = new_queue                                 # Save the queue to a list of running task output queues
    threading.Thread(target=enqueue_output,                                 # Spin up a new thread to keep track of moving the stdout to the queue
                     args=(process,                                         
                           new_queue), 
                     daemon=True).start()
    return jsonify(status_str='Process started', pid=process_id, status=202, mimetype='application/json')
        



@app.route("/stream/<process_id>")
def stream_process_feedback(process_id):
    if not feedback_queues[process_id]:
        print("Queue not found")
        return "Process not found", 404

    queue = feedback_queues[process_id]
    @stream_with_context
    def stream_from_queue(queue):
        try:
            while True:
                line = queue.get()
                print("within stream_from_queue, line = ", line)
                if line == "DONE":
                    yield f"data: {line}\n\n"
                    break
                yield f"data: {line}\n\n"
        finally:
            feedback_queues.pop(process_id, None)        # Clean up once queue is empty


    return Response(stream_from_queue(queue), content_type='text/event-stream')
 

@app.route('/tmp/<path:filename>')
def serve_tmp_file(filename):
    print(f"filename is {filename}")
    return send_from_directory('/tmp', filename)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

